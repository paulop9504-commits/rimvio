/**
 * Globe Prompt → Reality Workspace Agent
 *
 * Delegates to Cursor-style Agent Loop (STEP 7):
 * Observe → Understand → Retrieve → Select Tool → Patch → Projection → Verify → Wait
 *
 * Never stores chat essays in Workspace SSOT.
 * When no Workspace: try continuum mint for clear work kinds, else short hint only.
 */

import { runWorkspaceAgentPlan } from "@/lib/context-run/run-workspace-agent-plan";
import { tryApplyConversationalTurn } from "@/lib/context-run/try-apply-conversational-turn";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { resolveActiveWorkspaceContextId } from "@/lib/context-run/resolve-active-workspace-context";
import { beginAgentProductTurn } from "@/lib/context-run/agent-product-pipeline";
import { resolveAgentStatusWorkLog } from "@/lib/context-run/agent-status-work-log";
import { compileWorkspaceAgentPlan } from "@/lib/context-run/compile-workspace-agent-plan";
import {
  hasProvisionalContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import {
  beginAgentActivityTrail,
  finishAgentActivityTrail,
} from "@/lib/context-run/sync-agent-activity-trail";
import {
  runWorkspaceIntentContinuum,
  seedTravelDiscoveryForContinuum,
} from "@/lib/workspace-kind";
import { prepareCatalogWorkspaceStub } from "@/lib/workspace-kind/prepare-catalog-workspace-stub";
import { classifyWorkspaceKind } from "@/lib/workspace-kind/classify-workspace-kind";
import { classifyWorkspaceRoute } from "@/lib/workspace-kind/classify-workspace-route";
import { tryApplyRealityAbsorbFromUtterance } from "@/lib/reality-provider";
import {
  buildAnchorLodgingContinuumUtterance,
  isNearLodgingUtterance,
  resolveRealityAnchorFromUtterance,
  tryApplyPlaceLocateFromUtterance,
} from "@/lib/context-workspace/reality-anchor";
import { copy } from "@/lib/copy/human-ko";
import {
  publishGlobeProjectionLayerPolicy,
  readGlobeProjectionLayerPolicy,
} from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";

export type GlobeWorkspaceAgentTurnResult = {
  readonly handled: boolean;
  /** One-line status for toast / composer hint — never a chat essay. */
  readonly statusKo: string | null;
  readonly contextEventId: string | null;
  readonly workspaceMutated: boolean;
  readonly openedWorkspace: boolean;
  readonly committed: boolean;
  readonly via?:
    | "workspace_patch"
    | "spatial_discovery"
    | "workspace_prompt"
    | "reality_prepare"
    | "continuum_mint"
    | "free_talk"
    | "map_overlay"
    | "network_absorb";
  readonly patchKind?: string | null;
  readonly commitPending?: boolean;
  /** Alias — Article 0: never auto Commit. */
  readonly waitingCommit?: boolean;
  readonly phases?: readonly string[];
  /** Soft follow-up chips (map overlay / absorb) — not essay SSOT. */
  readonly softChips?: readonly {
    readonly labelKo: string;
    readonly utterance: string;
  }[];
  /** Address ambiguity chips — AgentChatCard objects */
  readonly objects?: readonly {
    readonly nodeId: string;
    readonly title: string;
    readonly subtitleKo: string;
    readonly kind: string;
    readonly ctaKo: string;
  }[];
};

const STATUS_MAX = 72;

export function shortenWorkspaceAgentStatus(
  replyKo: string | null | undefined,
): string | null {
  const raw = replyKo?.trim() ?? "";
  if (!raw) return null;
  const firstLine = raw.split(/\n+/u)[0]?.trim() ?? raw;
  if (firstLine.length <= STATUS_MAX) return firstLine;
  return `${firstLine.slice(0, STATUS_MAX - 1).trimEnd()}…`;
}

function viaFromTool(
  toolId: string,
): GlobeWorkspaceAgentTurnResult["via"] {
  if (toolId === "workspace_patch") return "workspace_patch";
  if (toolId === "spatial_discovery") return "spatial_discovery";
  if (toolId === "reality_prepare") return "reality_prepare";
  if (toolId === "workspace_prompt") return "workspace_prompt";
  return undefined;
}

/** Soft prepare — Workspace exists; user opens via 「펼치기」(ADR-022 Preview). */
function prepareWorkspaceSoft(contextEventId: string): void {
  writeContextWorkspaceExpanded(contextEventId, false);
}

/** Explicit expand — only from 「펼치기」chip / Resume. */
export function expandWorkspaceFromTrail(contextEventId: string): void {
  writeContextWorkspaceExpanded(contextEventId, true);
  dispatchContextWorkspaceExpand({
    contextEventId,
    source: "nl_open",
  });
}

function bindActiveContextPolicy(contextEventId: string): void {
  const prev = readGlobeProjectionLayerPolicy();
  publishGlobeProjectionLayerPolicy({
    ...prev,
    mode: "focus",
    activeContextEventId: contextEventId,
  });
}

async function finishContinuumMint(input: {
  readonly continuum: NonNullable<
    ReturnType<typeof runWorkspaceIntentContinuum>
  >;
  readonly utterance: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly statusKo?: string | null;
}): Promise<{
  readonly contextEventId: string;
  readonly statusKo: string | null;
}> {
  const { continuum } = input;
  // Soft — Activity Trail + 「펼치기」; never auto-fullscreen Workspace.
  prepareWorkspaceSoft(continuum.contextEventId);
  bindActiveContextPolicy(continuum.contextEventId);
  if (continuum.kind === "travel") {
    await seedTravelDiscoveryForContinuum({
      contextEventId: continuum.contextEventId,
      utterance: input.utterance,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    });
  }
  return {
    contextEventId: continuum.contextEventId,
    statusKo:
      input.statusKo ??
      continuum.card.ctaKo ??
      copy.globe.activityTrail.expandHint,
  };
}

/**
 * Mint a provisional Workspace when Globe Prompt has work intent but no draft yet.
 * Globe AI opens Continuum — user never taps 「작업장 열기」.
 * Does not Reality-Commit.
 */
async function tryMintWorkspaceForAgent(input: {
  readonly utterance: string;
  readonly explicitContextEventId?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): Promise<{
  readonly contextEventId: string;
  readonly statusKo: string | null;
} | null> {
  const utterance = input.utterance.trim();
  if (!utterance || !isWorkspaceAgentWorkUtterance(utterance)) {
    return null;
  }

  const kind =
    classifyWorkspaceKind(utterance) ??
    // Soft Travel when lodging/eatery work slipped classifier.
    (/호텔|숙소|맛집|식당|카페|렌터/iu.test(utterance) ? "travel" : null);

  if (kind === "travel" || kind === "driver" || kind === "used_goods") {
    const continuum = runWorkspaceIntentContinuum({
      utterance,
      graphId: input.explicitContextEventId?.trim() || `agent_${Date.now()}`,
      contextEventId: input.explicitContextEventId,
      createIfMissing: true,
      lat: input.lat,
      lng: input.lng,
      forceKind: kind,
    });
    if (!continuum) return null;
    return finishContinuumMint({
      continuum,
      utterance,
      lat: input.lat,
      lng: input.lng,
    });
  }

  // Reality Anchor Projection — lodging near known POI (USJ …) cold-start
  const anchor = resolveRealityAnchorFromUtterance(utterance);
  if (anchor && isNearLodgingUtterance(utterance)) {
    const seededUtterance = buildAnchorLodgingContinuumUtterance(
      utterance,
      anchor,
    );
    const continuum = runWorkspaceIntentContinuum({
      utterance: seededUtterance,
      graphId: input.explicitContextEventId?.trim() || `agent_${Date.now()}`,
      contextEventId: input.explicitContextEventId,
      createIfMissing: true,
      lat: anchor.lat,
      lng: anchor.lng,
      forceKind: "travel",
    });
    if (continuum?.contextEventId) {
      return finishContinuumMint({
        continuum,
        utterance,
        lat: anchor.lat,
        lng: anchor.lng,
        statusKo: `${anchor.labelKo} 기준 작업장을 열었어요`,
      });
    }
  }

  // Soft lodging find on existing Context Event without provisional Workspace.
  const existing = input.explicitContextEventId?.trim();
  if (existing && !hasProvisionalContextWorkspace(existing)) {
    const continuum = runWorkspaceIntentContinuum({
      utterance,
      graphId: existing,
      contextEventId: existing,
      createIfMissing: false,
      lat: input.lat,
      lng: input.lng,
      forceKind: "travel",
    });
    if (continuum?.contextEventId) {
      return finishContinuumMint({
        continuum,
        utterance,
        lat: input.lat,
        lng: input.lng,
      });
    }
  }

  return null;
}

/**
 * Workspace Resolver → Agent Loop → Auto Projection.
 */
export async function applyGlobeWorkspaceAgentTurn(input: {
  readonly utterance: string;
  readonly explicitContextEventId?: string | null;
  readonly contextEventId?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): Promise<GlobeWorkspaceAgentTurnResult> {
  const utterance = input.utterance.trim();
  if (!utterance) {
    return {
      handled: false,
      statusKo: null,
      contextEventId: null,
      workspaceMutated: false,
      openedWorkspace: false,
      committed: false,
    };
  }

  // Catalog Workspace routes (finance / document / coding) — stub prepare + open.
  {
    const route = classifyWorkspaceRoute(utterance);
    if (route.ship === "catalog") {
      const stub = prepareCatalogWorkspaceStub({
        utterance,
        route: route.route,
        explicitContextEventId:
          input.explicitContextEventId ?? input.contextEventId ?? null,
      });
      return {
        handled: true,
        statusKo: shortenWorkspaceAgentStatus(stub.statusKo),
        contextEventId: stub.contextEventId,
        workspaceMutated: true,
        openedWorkspace: true,
        committed: false,
        via: "continuum_mint",
        patchKind: `catalog:${stub.route}`,
      };
    }
  }

  // Free-talk / knowledge / casual chat BEFORE absorb · locate · Agent Loop.
  // Travel / Continuum work never falls into essay chat.
  if (!isWorkspaceAgentWorkUtterance(utterance)) {
    const chat = await tryApplyConversationalTurn({
      utterance,
      scopeId:
        input.explicitContextEventId ?? input.contextEventId ?? null,
    });
    if (chat) {
      const ctx = resolveActiveWorkspaceContextId({
        explicitContextEventId:
          input.explicitContextEventId ?? input.contextEventId ?? null,
      });
      return {
        handled: true,
        statusKo: chat.replyKo,
        contextEventId: ctx,
        workspaceMutated: false,
        openedWorkspace: false,
        committed: false,
        via: "free_talk",
        patchKind: chat.mode === "knowledge" ? "knowledge" : "free_talk",
      };
    }
  }

  // ADR-051 Reality absorb — single network ingress (Projection via overlay stores)
  const earlyPlan = compileWorkspaceAgentPlan({
    utterance,
    contextEventId:
      input.explicitContextEventId ?? input.contextEventId ?? null,
  });
  const multiStepPlan = earlyPlan.steps.length > 1;

  if (!multiStepPlan) {
    const absorb = tryApplyRealityAbsorbFromUtterance({
      utterance,
      contextEventId:
        input.explicitContextEventId ?? input.contextEventId ?? null,
    });
    if (absorb?.handled) {
      const ctx = resolveActiveWorkspaceContextId({
        explicitContextEventId:
          input.explicitContextEventId ?? input.contextEventId ?? null,
      });
      return {
        handled: true,
        statusKo: absorb.statusKo,
        contextEventId: ctx,
        workspaceMutated: absorb.workspacePatched,
        openedWorkspace: false,
        committed: false,
        via: "workspace_prompt",
        patchKind: "map_overlay",
      };
    }

    // Place / landmark locate — Anchor on map, 1-line hierarchy status.
    const placeLocate = await tryApplyPlaceLocateFromUtterance({
      utterance,
      contextEventId:
        input.explicitContextEventId ?? input.contextEventId ?? null,
      lat: input.lat,
      lng: input.lng,
    });
    if (placeLocate) {
      return {
        handled: true,
        statusKo: shortenWorkspaceAgentStatus(placeLocate.statusKo),
        contextEventId: placeLocate.contextEventId,
        workspaceMutated: placeLocate.workspaceMutated,
        openedWorkspace: placeLocate.openedWorkspace,
        committed: false,
        via: "workspace_prompt",
        patchKind: "place_locate",
        objects: placeLocate.objects,
      };
    }
  }

  let contextEventId = resolveActiveWorkspaceContextId({
    explicitContextEventId:
      input.explicitContextEventId ?? input.contextEventId ?? null,
  });
  let openedWorkspace = false;
  let mintStatusKo: string | null = null;

  if (!contextEventId) {
    const minted = await tryMintWorkspaceForAgent({
      utterance,
      explicitContextEventId:
        input.explicitContextEventId ?? input.contextEventId ?? null,
      lat: input.lat,
      lng: input.lng,
    });
    if (minted) {
      contextEventId = minted.contextEventId;
      // Soft Continuum mint — Workspace prepared; Trail + 「펼치기」open later.
      openedWorkspace = false;
      mintStatusKo = minted.statusKo;
    }
  }

  if (!contextEventId || !hasProvisionalContextWorkspace(contextEventId)) {
    return {
      handled: false,
      statusKo: shortenWorkspaceAgentStatus(
        mintStatusKo ??
          "활성 Workspace 없음 · 여행을 만들거나 작업장을 열어 주세요",
      ),
      contextEventId: contextEventId,
      workspaceMutated: false,
      openedWorkspace: false,
      committed: false,
      via: undefined,
    };
  }

  // STEP 1 — product pipeline + ADR-045 spine (before Agent Loop tools).
  beginAgentProductTurn({
    contextEventId,
    utterance,
  });
  beginAgentActivityTrail({
    goalKo: utterance,
    contextEventId,
  });

  // Always Plan runner — even single-step gets Observe→Act→Verify→Replan slot.
  const plan =
    multiStepPlan
      ? { ...earlyPlan, contextEventId }
      : compileWorkspaceAgentPlan({
          utterance,
          contextEventId,
        });
  {
    const ran = await runWorkspaceAgentPlan({
      utterance,
      explicitContextEventId: contextEventId,
      plan,
    });
    const lastTool = ran.lastLoop?.toolId ?? "workspace_patch";
    const commitPending = ran.commitPending === true;
    const statusFromPipeline = resolveAgentStatusWorkLog({
      contextEventId,
      fallbackKo: ran.statusKo ?? mintStatusKo,
    });
    const statusKo = shortenWorkspaceAgentStatus(
      statusFromPipeline ?? ran.statusKo ?? mintStatusKo,
    );
    finishAgentActivityTrail({
      goalKo: utterance,
      summaryKo: statusKo,
      contextEventId: ran.contextEventId ?? contextEventId,
      offerExpand: true,
    });
    return {
      handled: ran.ok || ran.workspaceMutated || Boolean(contextEventId),
      statusKo,
      contextEventId: ran.contextEventId ?? contextEventId,
      workspaceMutated: ran.workspaceMutated || Boolean(mintStatusKo),
      // Soft — never force-open Workspace shell; chat 「펼치기」does.
      openedWorkspace: false,
      committed: false,
      via: mintStatusKo
        ? "continuum_mint"
        : viaFromTool(lastTool),
      patchKind: ran.lastLoop?.patchKind ?? plan.planKind,
      commitPending,
      waitingCommit: commitPending,
      phases: ran.lastLoop?.phases,
    };
  }
}
