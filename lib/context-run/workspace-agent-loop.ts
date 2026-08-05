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
  readLastAgentProductTurn,
} from "@/lib/context-run/agent-product-pipeline";
import { writeAgentRuntimeProjectionFromWorkspace } from "@/lib/context-run/agent-runtime-projection";
import {
  ensureWorkspaceAnchorNode,
  extractNearPlaceLabelFromUtterance,
  gateNearScoutAnchorAsync,
} from "@/lib/context-workspace/reality-anchor";
import { runAgentP0Guards } from "@/lib/agent-policy/run-agent-p0-guards";

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

  // P0 guards — Job · Scope · Stale (Anchor gate runs on spatial / rescout).
  const p0 = runAgentP0Guards({
    contextEventId,
    utterance,
    patchKind: understood.patch?.kind ?? null,
  });

  // 5. Execute Patch / Tool
  phases.push("execute_patch");
  let statusKo: string | null = p0.statusHintKo;
  let patchKind: string | null = null;
  let patchRecord: import("@/lib/context-workspace/workspace-patch/types").WorkspacePatchRecord | null =
    null;
  let workspaceMutated = false;
  let commitPending = false;
  let focusIds: string[] | null = null;

  if (toolId === "workspace_patch" && understood.patch) {
    // Spatial constraint — pin Reality Anchor before Patch/scout (catalog → metro → geocode).
    if (understood.patch.kind === "spatial_constraint") {
      const nearLabel =
        understood.patch.nearLabelKo ||
        extractNearPlaceLabelFromUtterance(utterance);
      const nearGate = await gateNearScoutAnchorAsync({ utterance });
      // spatial_constraint always implies near — assert even if detector missed.
      if (!nearGate.gated || !nearGate.ok) {
        const statusKo =
          nearGate.gated && !nearGate.ok
            ? nearGate.statusKo
            : `${nearLabel || "그곳"} 위치를 정확히 확인하지 못했어요`;
        return fail({
          statusKo: shorten(statusKo),
          contextEventId,
          toolId,
        });
      }
      ensureWorkspaceAnchorNode({
        contextEventId,
        anchor: {
          entityId: nearGate.anchor.id,
          titleKo: nearGate.anchor.labelKo,
          labelKo: nearGate.anchor.labelKo,
          kind: nearGate.anchor.kind === "station" ? "station" : "attraction",
          lat: nearGate.anchor.lat,
          lng: nearGate.anchor.lng,
        },
        geoId: nearGate.anchor.id,
        summaryKo: `${nearGate.anchor.labelKo} · 검색 기준점`,
      });
    }

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
    if (p0.statusHintKo && applied.statusKo) {
      statusKo = `${p0.statusHintKo} · ${applied.statusKo}`;
    } else if (p0.statusHintKo) {
      statusKo = p0.statusHintKo;
    }
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
      return fail({
        statusKo: "Patch 없음",
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
