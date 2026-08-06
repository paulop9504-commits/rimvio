/**
 * STEP 7 — Cursor-style Workspace Agent Loop
 *
 * Aligns with ADR-050 product stages:
 * Observe/Understand ≈ Intent · Retrieve ≈ Context · Select/Plan ≈ Planner
 * Execute ≈ Discovery+Patch · Projection · Verify · Wait(Prepare/Commit)
 *
 * Default behavior: mutate Workspace (Patch). Never essay answers.
 * When Workspace exists, Patch always wins.
 */

import {
  applyWorkspacePatch,
  parseWorkspacePatch,
  type WorkspacePatch,
} from "@/lib/context-workspace/workspace-patch";
import { runAutoProjectionAfterPatch } from "@/lib/context-workspace/auto-projection";
import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { resolveActiveWorkspaceContextId } from "@/lib/context-run/resolve-active-workspace-context";
import {
  applySpatialDiscoveryToWorkspace,
  isSpatialDiscoveryUtterance,
} from "@/lib/spatial-retrieval/apply-spatial-discovery-to-workspace";
import { tryApplyWorkspacePromptTurn } from "@/lib/context-workspace/try-apply-workspace-lodging-turn";
import { runRealityPrepare, prepareHotelReservation } from "@/lib/prepare-layer";
import type { AutoProjectionResult } from "@/lib/context-workspace/auto-projection";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";
import {
  advanceAgentProductStage,
  failAgentProductStage,
  readLastAgentProductTurn,
} from "@/lib/context-run/agent-product-pipeline";
import { writeAgentRuntimeProjectionFromWorkspace } from "@/lib/context-run/agent-runtime-projection";
import { tryEnterCompareDecisionAfterRefine } from "@/lib/context-workspace/projection/try-enter-compare-after-refine";
import { projectAgentTurnSurfaces } from "@/lib/agent-policy/project-agent-turn-surfaces";
import { resolveWorkspaceMutationMode } from "@/lib/agent-policy/resolve-workspace-mutation-mode";
import { composeAgentVagueClarifyFromWorkspace } from "@/lib/context-run/compose-agent-vague-clarify";

export const WORKSPACE_AGENT_LOOP_PHASES = [
  "observe",
  "understand",
  "retrieve_context",
  "select_tool",
  "execute_patch",
  "projection",
  "verify",
  "wait",
] as const;

export type WorkspaceAgentLoopPhase =
  (typeof WORKSPACE_AGENT_LOOP_PHASES)[number];

export type WorkspaceAgentToolId =
  | "workspace_patch"
  | "spatial_discovery"
  | "workspace_prompt"
  | "reality_prepare"
  | "noop";

export type WorkspaceAgentLoopResult = {
  readonly ok: boolean;
  readonly phases: readonly WorkspaceAgentLoopPhase[];
  readonly toolId: WorkspaceAgentToolId;
  readonly patchKind: string | null;
  readonly contextEventId: string | null;
  readonly workspaceMutated: boolean;
  /** One-line status only — never a chat essay */
  readonly statusKo: string | null;
  readonly projection: AutoProjectionResult | null;
  readonly verified: boolean;
  readonly waiting: true;
  readonly essayForbidden: true;
  readonly commitPending: boolean;
};

function shorten(text: string | null | undefined, max = 72): string | null {
  const t = text?.trim() ?? "";
  if (!t) return null;
  const line = t.split(/\n+/u)[0]!.trim();
  return line.length <= max ? line : `${line.slice(0, max - 1).trimEnd()}…`;
}

function understandIntent(utterance: string): {
  readonly action: string;
  readonly patch: WorkspacePatch | null;
  readonly spatial: boolean;
  readonly prepare: boolean;
} {
  const patch = parseWorkspacePatch(utterance);
  const prepare = /예약\s*준비|prepare|준비해/iu.test(utterance);
  const spatial = isSpatialDiscoveryUtterance(utterance);
  return {
    action: patch?.kind ?? (prepare ? "prepare" : spatial ? "spatial_discovery" : "prompt"),
    patch,
    spatial,
    prepare,
  };
}

function selectTool(input: {
  readonly utterance: string;
  readonly understood: ReturnType<typeof understandIntent>;
}): WorkspaceAgentToolId {
  if (input.understood.prepare) return "reality_prepare";

  // Soft stay / refine Patch first — never force live wipe via prompt.
  if (input.understood.patch?.kind === "filter_entity") {
    return "workspace_patch";
  }

  // Reality Anchor Projection — spatial_constraint Patch + live lodging scout
  // beats stub Spatial Discovery for 「USJ 근처 숙소」.
  if (input.understood.patch?.kind === "spatial_constraint") {
    return "workspace_patch";
  }

  // 「캡슐호텔 찾아줘」— lodging Reality Patch + rescout.
  // Spatial Discovery defaults target to restaurant and drops stay-type.
  const stayType = parseLodgingStayTypeFromText(input.utterance);
  if (
    stayType &&
    stayType !== "hotel" &&
    !/근처|주변|near|around|기준으로/iu.test(input.utterance)
  ) {
    return "workspace_prompt";
  }
  if (
    /(?:호텔|숙소)\s*(?:찾아|보여|검색)|(?:찾아|보여|검색).*(?:호텔|숙소)/iu.test(
      input.utterance,
    ) &&
    !/근처|주변|near|around|기준/iu.test(input.utterance)
  ) {
    return "workspace_prompt";
  }

  // Prefer Spatial Retrieval when discovering entities near an anchor
  if (
    input.understood.spatial &&
    /맛집|식당|카페|cafe|restaurant|숙소|호텔|놀거리|관광|찾아|discover/iu.test(
      input.utterance,
    )
  ) {
    return "spatial_discovery";
  }
  if (input.understood.patch) return "workspace_patch";
  if (input.understood.spatial) return "spatial_discovery";
  return "workspace_prompt";
}

/**
 * Run one Cursor-style Agent Loop turn against the active Workspace.
 */
export async function runWorkspaceAgentLoop(input: {
  readonly utterance: string;
  readonly explicitContextEventId?: string | null;
}): Promise<WorkspaceAgentLoopResult> {
  const utterance = input.utterance.trim();
  const phases: WorkspaceAgentLoopPhase[] = [];
  const fail = (
    partial: Partial<WorkspaceAgentLoopResult>,
  ): WorkspaceAgentLoopResult => ({
    ok: false,
    phases,
    toolId: "noop",
    patchKind: null,
    contextEventId: null,
    workspaceMutated: false,
    statusKo: null,
    projection: null,
    verified: false,
    waiting: true,
    essayForbidden: true,
    commitPending: false,
    ...partial,
  });

  if (!utterance) return fail({ statusKo: null });

  // 1. Observe
  phases.push("observe");
  const contextEventId = resolveActiveWorkspaceContextId({
    explicitContextEventId: input.explicitContextEventId,
  });
  if (!contextEventId || !hasProvisionalContextWorkspace(contextEventId)) {
    return fail({
      statusKo: "활성 Workspace 없음",
      contextEventId,
    });
  }
  const before = readContextWorkspace(contextEventId);

  // 2. Understand
  phases.push("understand");
  const understood = understandIntent(utterance);

  // 3. Retrieve Context
  phases.push("retrieve_context");
  const ctx = readContextWorkspace(contextEventId);
  if (!ctx) {
    return fail({ statusKo: "Context 없음", contextEventId });
  }

  // 4. Select Tool — Patch always preferred when parseable
  phases.push("select_tool");
  const toolId = selectTool({ utterance, understood });
  {
    const product = readLastAgentProductTurn();
    if (product?.contextEventId === contextEventId) {
      advanceAgentProductStage(product, "planner");
    }
  }

  // 5. Execute Patch / Tool
  phases.push("execute_patch");
  let statusKo: string | null = null;
  let patchKind: string | null = null;
  let patchRecord: import("@/lib/context-workspace/workspace-patch/types").WorkspacePatchRecord | null =
    null;
  let workspaceMutated = false;
  let commitPending = false;
  let focusIds: string[] | null = null;

  if (toolId === "workspace_patch" && understood.patch) {
    const applied = applyWorkspacePatch({
      contextEventId,
      patch: understood.patch,
      utterance,
      skipAutoProjection: true,
    });
    if (!applied.ok) {
      return fail({
        statusKo: shorten(applied.statusKo),
        contextEventId,
        toolId,
      });
    }
    statusKo = applied.statusKo;
    patchKind = understood.patch.kind;
    patchRecord = applied.record;
    workspaceMutated = true;
    // Stay-type / spatial constraint → live scout so map fills with matching venues.
    // Explicit find ("캡슐호텔 찾아") always rescouts even if soft-filter matched a few.
    const stayFind =
      understood.patch.kind === "replace_entity" &&
      Boolean(
        "stayType" in understood.patch && understood.patch.stayType,
      ) &&
      /찾아|검색|보여|다시|바꿔/iu.test(utterance);
    if (
      (applied.needsRescout || stayFind) &&
      applied.scoutQuery?.trim()
    ) {
      const scouted = await tryApplyWorkspacePromptTurn({
        utterance: applied.scoutQuery,
        contextEventId,
      });
      if (scouted.handled && scouted.replyKo?.trim()) {
        statusKo = scouted.replyKo;
      }
    }
    focusIds = [...(readContextWorkspace(contextEventId)?.selectedIds ?? [])];

    // P2 — soft Top-N refine → Compare Decision callouts (not essay SSOT).
    if (understood.patch.kind === "filter_entity") {
      const keepTopN =
        "filter" in understood.patch
          ? (understood.patch.filter.keepTopN ?? null)
          : null;
      const compare = tryEnterCompareDecisionAfterRefine({
        contextEventId,
        utterance,
        keepTopN,
      });
      if (compare.entered && compare.replyKo) {
        statusKo = `${statusKo} · ${compare.replyKo}`;
        focusIds = [...(compare.result?.candidateEntityIds ?? focusIds ?? [])];
      }
    }
  } else if (toolId === "spatial_discovery") {
    const spatial = applySpatialDiscoveryToWorkspace({
      utterance,
      contextEventId,
      skipAutoProjection: true,
    });
    if (!spatial.handled) {
      return fail({
        statusKo: "Spatial Discovery 실패",
        contextEventId,
        toolId,
      });
    }
    statusKo = spatial.statusKo;
    patchKind = "create_entity";
    workspaceMutated = spatial.entityCount > 0 || Boolean(spatial.statusKo);
    const afterSpatial = readContextWorkspace(contextEventId);
    focusIds = afterSpatial?.nodes
      .filter((n) => n.kind === "eatery" && n.visible)
      .slice(0, 3)
      .map((n) => n.id) ?? null;
  } else if (toolId === "reality_prepare") {
    const lodging =
      ctx.nodes.find((n) => n.selected && n.kind === "lodging") ??
      ctx.nodes.find((n) => n.kind === "lodging" && n.visible) ??
      null;
    const entityId = lodging?.placeId ?? lodging?.id ?? "";
    if (!entityId) {
      return fail({
        statusKo: "Prepare할 숙소 없음",
        contextEventId,
        toolId,
      });
    }
    const prepared = prepareHotelReservation({
      entityId,
      hotelTitle: lodging?.title ?? "숙소",
      utterance,
      workspaceId: contextEventId,
      priceLabelKo: lodging?.amountLabel ?? null,
      guests: 2,
      checkInIso: "2026-08-10",
      checkOutIso: "2026-08-12",
    });
    const fallback =
      !prepared.ok
        ? runRealityPrepare({
            entityId,
            utterance,
            workspaceId: contextEventId,
            action: "reservation_prepare",
            titleHint: lodging?.title ?? null,
            priceLabelKo: lodging?.amountLabel ?? null,
            guests: 2,
          })
        : null;
    const ok = prepared.ok || Boolean(fallback?.ok);
    statusKo = ok
      ? "예약 준비 · Commit Pending"
      : prepared.ok === false
        ? prepared.reasonKo ?? "Prepare 실패"
        : fallback && !fallback.ok
          ? fallback.reasonKo ?? "Prepare 실패"
          : "Prepare 실패";
    workspaceMutated = ok;
    commitPending = ok;
    patchKind = "create_draft";
    focusIds = lodging ? [lodging.id] : null;
    if (ok) {
      const turn = readLastAgentProductTurn();
      if (turn?.contextEventId === contextEventId) {
        advanceAgentProductStage(turn, "prepare");
      }
      writeAgentRuntimeProjectionFromWorkspace({
        contextEventId,
        preparePending: true,
        commitPending: true,
      });
    }
  } else {
    const prompt = await tryApplyWorkspacePromptTurn({
      utterance,
      contextEventId,
    });
    if (!prompt.handled) {
      const clarify = composeAgentVagueClarifyFromWorkspace({
        utterance,
        contextEventId,
      });
      const product = readLastAgentProductTurn();
      if (product?.contextEventId === contextEventId) {
        failAgentProductStage(product, "workspace_patch", clarify);
        writeAgentRuntimeProjectionFromWorkspace({ contextEventId });
      }
      return fail({
        statusKo: shorten(clarify, 96),
        contextEventId,
        toolId: "workspace_prompt",
      });
    }
    statusKo = prompt.replyKo;
    workspaceMutated = true;
    patchKind = "update_entity";
    focusIds = [...(readContextWorkspace(contextEventId)?.selectedIds ?? [])];
  }

  // 6. Projection (always automatic)
  phases.push("projection");
  const projection = runAutoProjectionAfterPatch({
    contextEventId,
    patchRecord,
    entityIds: focusIds,
  });

  // 7. Verify
  phases.push("verify");
  const after = readContextWorkspace(contextEventId);
  const verified =
    Boolean(after) &&
    projection.ok &&
    projection.manualRefreshRequired === false &&
    (workspaceMutated ||
      after?.updatedAtIso !== before?.updatedAtIso ||
      (after?.patches?.length ?? 0) > (before?.patches?.length ?? 0));

  // Dual surfaces + honest product stage tape (not bare scout string / "Patch 없음")
  const visible = (after?.nodes ?? []).filter((n) => n.visible);
  const titles = visible.slice(0, 3).map((n) => n.title);
  const hadVisibleBefore = Boolean(before?.nodes.some((n) => n.visible));
  const mutation = resolveWorkspaceMutationMode({
    utterance,
    hasVisibleCandidates: hadVisibleBefore || visible.length > 0,
  });
  const mutationMode =
    mutation.mode === "none"
      ? toolId === "workspace_patch" && understood.patch?.kind === "filter_entity"
        ? "refine"
        : "replace"
      : mutation.mode;
  const surfaces = projectAgentTurnSurfaces({
    mutationMode,
    reasonKo: mutation.replyHintKo ?? statusKo,
    factsKo: [after?.lastChangeKo ?? null, statusKo].filter(
      (x): x is string => Boolean(x?.trim()),
    ),
    candidateCount: visible.length,
    entityTitlesKo: titles,
  });
  statusKo = surfaces.llmReplyKo || statusKo;

  {
    let product = readLastAgentProductTurn();
    if (product?.contextEventId === contextEventId) {
      const { yieldBetweenAgentStages } = await import(
        "@/lib/context-run/stream-cursor-style-bootstrap-tape"
      );
      const discoveryLike =
        toolId === "spatial_discovery" ||
        toolId === "workspace_prompt" ||
        (toolId === "workspace_patch" &&
          (understood.patch?.kind === "spatial_constraint" ||
            understood.patch?.kind === "replace_entity"));
      if (discoveryLike) {
        await yieldBetweenAgentStages(70);
        product = advanceAgentProductStage(
          product,
          "object_discovery",
          `후보 ${visible.length}곳`,
        );
        await yieldBetweenAgentStages(70);
        product = advanceAgentProductStage(product, "object_enrichment");
        await yieldBetweenAgentStages(70);
        product = advanceAgentProductStage(
          product,
          "candidate_evaluation",
          surfaces.calloutLinesKo[0] ?? null,
        );
      }
      if (workspaceMutated || toolId === "workspace_patch") {
        await yieldBetweenAgentStages(60);
        product = advanceAgentProductStage(
          product,
          "workspace_patch",
          surfaces.calloutLinesKo[0] ?? statusKo,
        );
      }
      await yieldBetweenAgentStages(50);
      product = advanceAgentProductStage(product, "projection");
      await yieldBetweenAgentStages(50);
      advanceAgentProductStage(product, "agent_status", surfaces.llmReplyKo);
    }
    writeAgentRuntimeProjectionFromWorkspace({
      contextEventId,
      preparePending: commitPending,
      commitPending,
    });
  }

  // 8. Wait (human — never auto Commit)
  phases.push("wait");

  return {
    ok: verified || workspaceMutated,
    phases,
    toolId,
    patchKind,
    contextEventId,
    workspaceMutated,
    statusKo: shorten(statusKo),
    projection,
    verified,
    waiting: true,
    essayForbidden: true,
    commitPending,
  };
}
