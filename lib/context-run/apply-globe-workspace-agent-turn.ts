/**
 * Globe Prompt → Reality Workspace Agent
 *
 * Delegates to Cursor-style Agent Loop (STEP 7):
 * Observe → Understand → Retrieve → Select Tool → Patch → Projection → Verify → Wait
 *
 * Never stores chat essays in Workspace SSOT.
 * When no Workspace: try continuum mint for clear work kinds, else short hint only.
 */

import { runWorkspaceAgentLoop } from "@/lib/context-run/workspace-agent-loop";
import { compileWorkspaceAgentPlan } from "@/lib/context-run/compile-workspace-agent-plan";
import { runWorkspaceAgentPlan } from "@/lib/context-run/run-workspace-agent-plan";
import { resolveActiveWorkspaceContextId } from "@/lib/context-run/resolve-active-workspace-context";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { beginAgentProductTurn } from "@/lib/context-run/agent-product-pipeline";
import { resolveAgentStatusWorkLog } from "@/lib/context-run/agent-status-work-log";
import {
  hasProvisionalContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import {
  runWorkspaceIntentContinuum,
  seedTravelLodgingForContinuum,
} from "@/lib/workspace-kind/run-workspace-intent-continuum";
import { classifyWorkspaceKind } from "@/lib/workspace-kind/classify-workspace-kind";
import { tryApplyRealityAbsorbFromUtterance } from "@/lib/reality-provider";
import {
  buildAnchorLodgingContinuumUtterance,
  isNearLodgingUtterance,
  resolveRealityAnchorFromUtterance,
  tryApplyPlaceLocateFromUtterance,
} from "@/lib/context-workspace/reality-anchor";

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

function expandWorkspace(contextEventId: string): void {
  writeContextWorkspaceExpanded(contextEventId, true);
  dispatchContextWorkspaceExpand({
    contextEventId,
    source: "nl_open",
  });
}

/**
 * Mint a provisional Workspace when Globe Prompt has work intent but no draft yet.
 * Does not Reality-Commit. Returns contextEventId or null.
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

  const kind = classifyWorkspaceKind(utterance);
  if (kind !== "travel" && kind !== "driver" && kind !== "used_goods") {
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
      });
      if (continuum?.contextEventId) {
        expandWorkspace(continuum.contextEventId);
        if (continuum.kind === "travel") {
          await seedTravelLodgingForContinuum({
            contextEventId: continuum.contextEventId,
            utterance,
            lat: anchor.lat,
            lng: anchor.lng,
          });
        }
        return {
          contextEventId: continuum.contextEventId,
          statusKo:
            continuum.card.ctaKo ??
            `${anchor.labelKo} 기준 작업장을 열었어요`,
        };
      }
    }

    // Soft lodging find without trip frame — need an existing Context Event.
    const existing = input.explicitContextEventId?.trim();
    if (existing && !hasProvisionalContextWorkspace(existing)) {
      // Continuum travel path can attach lodging workspace to existing event.
      const continuum = runWorkspaceIntentContinuum({
        utterance,
        graphId: existing,
        contextEventId: existing,
        createIfMissing: false,
        lat: input.lat,
        lng: input.lng,
      });
      if (continuum?.contextEventId) {
        expandWorkspace(continuum.contextEventId);
        if (continuum.kind === "travel") {
          await seedTravelLodgingForContinuum({
            contextEventId: continuum.contextEventId,
            utterance,
            lat: input.lat ?? null,
            lng: input.lng ?? null,
          });
        }
        return {
          contextEventId: continuum.contextEventId,
          statusKo: continuum.card.ctaKo ?? "작업장을 열었어요",
        };
      }
    }
    return null;
  }

  const continuum = runWorkspaceIntentContinuum({
    utterance,
    graphId: input.explicitContextEventId?.trim() || `agent_${Date.now()}`,
    contextEventId: input.explicitContextEventId,
    createIfMissing: true,
    lat: input.lat,
    lng: input.lng,
  });
  if (!continuum) return null;

  expandWorkspace(continuum.contextEventId);
  if (continuum.kind === "travel") {
    await seedTravelLodgingForContinuum({
      contextEventId: continuum.contextEventId,
      utterance,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    });
  }
  return {
    contextEventId: continuum.contextEventId,
    statusKo: continuum.card.ctaKo ?? "작업장을 열었어요",
  };
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
      openedWorkspace = true;
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
      openedWorkspace,
      committed: false,
      via: openedWorkspace ? "continuum_mint" : undefined,
    };
  }

  // STEP 1 — product pipeline + ADR-045 spine (before Agent Loop tools).
  beginAgentProductTurn({
    contextEventId,
    utterance,
  });

  // Multi-step Plan (Day B / Compound C) — sequential Loop turns.
  const plan =
    multiStepPlan
      ? { ...earlyPlan, contextEventId }
      : compileWorkspaceAgentPlan({
          utterance,
          contextEventId,
        });
  if (plan.steps.length > 1) {
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
    return {
      handled: ran.ok || ran.workspaceMutated || openedWorkspace,
      statusKo: shortenWorkspaceAgentStatus(
        statusFromPipeline ?? ran.statusKo ?? mintStatusKo,
      ),
      contextEventId: ran.contextEventId ?? contextEventId,
      workspaceMutated: ran.workspaceMutated || openedWorkspace,
      openedWorkspace: openedWorkspace || Boolean(ran.contextEventId),
      committed: false,
      via: viaFromTool(lastTool),
      patchKind: ran.lastLoop?.patchKind ?? plan.planKind,
      commitPending,
      waitingCommit: commitPending,
      phases: ran.lastLoop?.phases,
    };
  }

  const loop = await runWorkspaceAgentLoop({
    utterance,
    explicitContextEventId: contextEventId,
  });

  if (!loop.ok && !loop.workspaceMutated) {
    return {
      handled: openedWorkspace,
      statusKo: shortenWorkspaceAgentStatus(
        loop.statusKo ?? mintStatusKo,
      ),
      contextEventId: loop.contextEventId ?? contextEventId,
      workspaceMutated: false,
      openedWorkspace,
      committed: false,
      via: openedWorkspace ? "continuum_mint" : viaFromTool(loop.toolId),
      phases: loop.phases,
      commitPending: false,
      waitingCommit: false,
    };
  }

  const commitPending = loop.commitPending === true;
  const statusFromPipeline = resolveAgentStatusWorkLog({
    contextEventId,
    fallbackKo: loop.statusKo ?? mintStatusKo,
  });
  return {
    handled: true,
    statusKo: shortenWorkspaceAgentStatus(
      statusFromPipeline ?? loop.statusKo ?? mintStatusKo,
    ),
    contextEventId: loop.contextEventId ?? contextEventId,
    workspaceMutated: loop.workspaceMutated || openedWorkspace,
    openedWorkspace: openedWorkspace || Boolean(loop.contextEventId),
    committed: false,
    via: openedWorkspace && !loop.workspaceMutated
      ? "continuum_mint"
      : viaFromTool(loop.toolId),
    patchKind: loop.patchKind,
    commitPending,
    waitingCommit: commitPending,
    phases: loop.phases,
  };
}
