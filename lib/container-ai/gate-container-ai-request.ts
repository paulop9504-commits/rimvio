/**
 * Container AI — gate user requests against active Execution Graph node.
 * e.g. Prepare + "주변 호텔" → blocked, offer destination choices.
 * Travel onboarding: one-shot parallel exception when destination confirmed +
 * first-visit + date range (never while Ingress destination is unresolved).
 * @see docs/RIMVIO_CONTAINER_AI.md
 */

import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { ContainerAIGateOutcome } from "@/lib/container-ai/types";
import { readContainerAIContext } from "@/lib/container-ai/read-container-ai-context";
import { evaluateOnboardingParallelException } from "@/lib/container-ai/evaluate-onboarding-parallel-exception";

const LODGING_HINT =
  /주변|호텔|숙소|hotel|lodging|stay|숙박|宿|ホテル/iu;
const SIMILAR_PRICE_HINT = /비슷한|같은\s*가격|similar\s*price/iu;
const WALK_DISTANCE_HINT = /걸어|도보|walk|분\s*이내/iu;
const EATERY_HINT = /맛집|식당|먹을|restaurant|eatery/iu;

const DEFAULT_DESTINATION_CHOICES = [
  { id: "osaka", label: "오사카" },
  { id: "tokyo", label: "도쿄" },
  { id: "fukuoka", label: "후쿠오카" },
] as const;

const LODGING_READY_NODE_KINDS = new Set(["stay", "allocate"]);
const LODGING_READY_NODE_IDS = new Set(["stay", "exec-lodging"]);

function isLodgingRequest(message: string): boolean {
  return LODGING_HINT.test(message);
}

function isEateryRequest(message: string): boolean {
  return EATERY_HINT.test(message);
}

function nodeAllowsLodging(
  ctx: NonNullable<ReturnType<typeof readContainerAIContext>>,
): boolean {
  const { activeNode } = ctx;
  if (activeNode.status === "blocked") {
    return false;
  }
  if (activeNode.resolution === "unresolved") {
    return false;
  }
  if (LODGING_READY_NODE_KINDS.has(activeNode.kind)) {
    return activeNode.status === "ready" || activeNode.status === "running" || activeNode.status === "prepared";
  }
  if (LODGING_READY_NODE_IDS.has(activeNode.nodeId)) {
    return activeNode.status !== "blocked" && activeNode.status !== "pending";
  }
  return false;
}

function destinationIsReady(ctx: NonNullable<ReturnType<typeof readContainerAIContext>>): boolean {
  return ctx.destinationResolution === "confirmed" || ctx.destinationResolution === "hypothesis";
}

/** Route or block — Container AI orchestrates internal modules from one user message. */
export function gateContainerAIRequest(input: {
  blueprint: ContextBlueprint;
  userMessage: string;
  activeNodeId?: string | null;
  /** Explicit destination commit (not Ingress hypothesis). */
  destinationConfirmed?: boolean;
}): ContainerAIGateOutcome {
  const message = input.userMessage.trim();
  if (!message) {
    return { allowed: true, routeModule: "action_composer", domainExecutor: null };
  }

  const ctx = readContainerAIContext({
    blueprint: input.blueprint,
    activeNodeId: input.activeNodeId,
  });
  if (!ctx) {
    return { allowed: true, routeModule: "context_condition_ai", domainExecutor: "lodging" };
  }

  // Broad-scope parallel — before lodging/eatery early block so a full trip
  // declaration is not reduced to destination chips only. Narrow stays single-tool.
  const onboarding = evaluateOnboardingParallelException({
    blueprint: input.blueprint,
    userMessage: message,
    activeNodeId: input.activeNodeId,
    destinationConfirmed: input.destinationConfirmed,
  });
  if (onboarding.allowed) {
    return {
      allowed: true,
      routeModule: "domain_ai_router",
      domainExecutor: "travel",
      onboardingParallel: {
        source: onboarding.source,
        parallelNodeIds: onboarding.parallelNodeIds,
        destinationLabel: onboarding.destinationLabel,
      },
    };
  }

  const wantsLodging = isLodgingRequest(message);
  const wantsEatery = isEateryRequest(message);
  const wantsWalk = WALK_DISTANCE_HINT.test(message);
  const wantsSimilarPrice = SIMILAR_PRICE_HINT.test(message);

  if (wantsLodging || wantsEatery) {
    const earlyPhase = ["prepare", "trip", "discover"].includes(ctx.activeNode.kind);
    if (earlyPhase || !nodeAllowsLodging(ctx) || !destinationIsReady(ctx)) {
      return {
        allowed: false,
        reasonKo:
          `현재는 ${ctx.activeNode.label} 단계입니다. 먼저 목적지를 확정하면 숙소를 추천할 수 있습니다.`,
        suggestedNodeKind: "prepare",
        destinationChoices: [...DEFAULT_DESTINATION_CHOICES],
        quickActions: DEFAULT_DESTINATION_CHOICES.map((row) => ({
          id: row.id,
          label: row.label,
        })),
      };
    }
  }

  if (wantsSimilarPrice) {
    return {
      allowed: true,
      routeModule: "travel_brain",
      domainExecutor: "lodging",
    };
  }

  if (wantsWalk) {
    return {
      allowed: true,
      routeModule: "context_condition_ai",
      domainExecutor: "lodging",
    };
  }

  if (wantsLodging) {
    return {
      allowed: true,
      routeModule: "domain_ai_router",
      domainExecutor: "lodging",
    };
  }

  if (wantsEatery) {
    return {
      allowed: true,
      routeModule: "domain_ai_router",
      domainExecutor: "eatery",
    };
  }

  return {
    allowed: true,
    routeModule: "context_condition_ai",
    domainExecutor: ctx.activeNode.kind === "stay" ? "lodging" : null,
  };
}
