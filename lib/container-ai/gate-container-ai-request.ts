/**
 * Container AI — gate user requests against active Execution Graph node.
 * e.g. Prepare + "주변 호텔" → blocked, offer destination choices.
 * Travel onboarding: one-shot parallel exception when destination confirmed +
 * first-visit + date range (never while Ingress destination is unresolved).
 * @see docs/RIMVIO_CONTAINER_AI.md
 */

import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import type { ContainerAIGateOutcome } from "@/lib/container-ai/types";
import { readContainerAIContext } from "@/lib/container-ai/read-container-ai-context";
import { evaluateOnboardingParallelException } from "@/lib/container-ai/evaluate-onboarding-parallel-exception";

import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import {
  FALLBACK_DESTINATION_HUBS,
  hubChoiceRowsForCountry,
} from "@/lib/globe/country-travel-hubs";

const SIMILAR_PRICE_HINT = /비슷한|같은\s*가격|similar\s*price/iu;
const WALK_DISTANCE_HINT = /걸어|도보|walk|분\s*이내/iu;

function destinationChoicesForBlueprint(
  blueprint: ContextBlueprint,
): readonly { id: string; label: string }[] {
  const region = blueprint.resourcePlan.knownTruth.find(
    (row) => row.slotId === "region",
  )?.value;
  const regionLabel = typeof region === "string" ? region : null;
  const hubs = hubChoiceRowsForCountry(regionLabel);
  if (hubs.length > 0) return hubs;
  return FALLBACK_DESTINATION_HUBS;
}

function isLodgingRequest(message: string): boolean {
  return hasLodgingDomainCue(message);
}

function isEateryRequest(message: string): boolean {
  return hasEateryDomainCue(message);
}

function destinationIsReady(ctx: NonNullable<ReturnType<typeof readContainerAIContext>>): boolean {
  return ctx.destinationResolution === "confirmed" || ctx.destinationResolution === "hypothesis";
}

/** Route or block — Container AI orchestrates internal modules from one user message. */
export function gateContainerAIRequest(input: {
  blueprint: ContextBlueprint;
  userMessage: string;
  activeNodeId?: string | null;
  executionPlan?: ContextExecutionPlanV1 | null;
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
    executionPlan: input.executionPlan ?? null,
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
    const destReady =
      destinationIsReady(ctx) || input.destinationConfirmed === true;
    // Unresolved destination → chips only (Article 0).
    if (!destReady) {
      return {
        allowed: false,
        reasonKo:
          `현재는 ${ctx.activeNode.label} 단계입니다. 먼저 목적지를 확정하면 숙소를 추천할 수 있습니다.`,
        suggestedNodeKind: "prepare",
        destinationChoices: [...destinationChoicesForBlueprint(input.blueprint)],
        quickActions: destinationChoicesForBlueprint(input.blueprint).map((row) => ({
          id: row.id,
          label: row.label,
        })),
      };
    }
    // Destination known — allow lodging/eatery even during Prepare (Operator scout).
    if (wantsLodging) {
      return {
        allowed: true,
        routeModule: "domain_ai_router",
        domainExecutor: "lodging",
      };
    }
    return {
      allowed: true,
      routeModule: "domain_ai_router",
      domainExecutor: "eatery",
    };
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

  return {
    allowed: true,
    routeModule: "context_condition_ai",
    domainExecutor: ctx.activeNode.kind === "stay" ? "lodging" : null,
  };
}
