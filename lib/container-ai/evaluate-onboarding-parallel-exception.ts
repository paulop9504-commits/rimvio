/**
 * onboarding_parallel_exception — broad-scope gate on TravelTrip Blueprint.
 * Opens whenever the utterance is broad (not "first turn only").
 * Does not invent a fourth "container". Does not run domain search inside Ingress.
 * @see docs/RIMVIO_CONTAINER_AI.md
 */

import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { readContainerAIContext } from "@/lib/container-ai/read-container-ai-context";
import { classifyTravelRequestScope } from "@/lib/container-ai/classify-travel-request-scope";
import { TRAVEL_ONBOARDING_PARALLEL_NODE_IDS } from "@/lib/context-blueprint/node-resource-state";

export type OnboardingParallelExceptionInput = {
  blueprint: ContextBlueprint;
  userMessage: string;
  activeNodeId?: string | null;
  /**
   * Destination must already be confirmed (user commit / stage advance).
   * Ingress hypothesis/unresolved must not open this gate.
   */
  destinationConfirmed?: boolean;
};

export type OnboardingParallelExceptionDenied = {
  readonly allowed: false;
  readonly code:
    | "destination_not_confirmed"
    | "request_scope_narrow"
    | "missing_destination_label"
    | "no_operator_context";
  readonly reasonKo: string;
  readonly scope?: "broad" | "narrow";
};

export type OnboardingParallelExceptionGranted = {
  readonly allowed: true;
  readonly code: "onboarding_parallel_exception";
  readonly source: "onboarding_bootstrap";
  readonly scope: "broad";
  readonly parallelNodeIds: readonly string[];
  readonly destinationLabel: string;
};

export type OnboardingParallelExceptionResult =
  | OnboardingParallelExceptionDenied
  | OnboardingParallelExceptionGranted;

export {
  classifyTravelRequestScope,
  hasDateRangeSignal,
  hasDelegationSignal,
  hasFirstVisitSignal,
  hasNarrowCategorySignal,
  hasTripFrameSignal,
} from "@/lib/container-ai/classify-travel-request-scope";

/**
 * Fan-out departure+stay+explore when the request itself is broad.
 * Re-opens on later broad asks (e.g. mid-trip "거기도 다 찾아줘").
 * Narrow asks stay on single-tool LocalDiscovery.
 */
export function evaluateOnboardingParallelException(
  input: OnboardingParallelExceptionInput,
): OnboardingParallelExceptionResult {
  const message = input.userMessage.trim();
  const ctx = readContainerAIContext({
    blueprint: input.blueprint,
    activeNodeId: input.activeNodeId,
  });
  if (!ctx) {
    return {
      allowed: false,
      code: "no_operator_context",
      reasonKo: "실행 단계 맥락을 아직 못 읽었어요.",
    };
  }

  const classified = classifyTravelRequestScope(message);
  if (classified.scope === "narrow") {
    return {
      allowed: false,
      code: "request_scope_narrow",
      scope: "narrow",
      reasonKo: "지금은 그 한 가지만 찾아볼게요.",
    };
  }

  const destinationExplicitlyConfirmed = input.destinationConfirmed === true;
  const destinationConfirmed =
    destinationExplicitlyConfirmed ||
    ctx.destinationResolution === "confirmed";
  // Ingress may leave destination hypothesis/unresolved — never parallel then,
  // unless the caller already recorded an explicit destination commit.
  if (!destinationConfirmed) {
    return {
      allowed: false,
      code: "destination_not_confirmed",
      scope: "broad",
      reasonKo: "목적지가 확정된 뒤에만 항공·숙소·놀거리를 한꺼번에 준비할 수 있어요.",
    };
  }
  if (
    !destinationExplicitlyConfirmed &&
    (ctx.destinationResolution === "unresolved" ||
      ctx.destinationResolution === "hypothesis")
  ) {
    return {
      allowed: false,
      code: "destination_not_confirmed",
      scope: "broad",
      reasonKo: "목적지가 확정된 뒤에만 항공·숙소·놀거리를 한꺼번에 준비할 수 있어요.",
    };
  }

  const destinationLabel = ctx.destinationLabel?.trim() ?? "";
  if (!destinationLabel) {
    return {
      allowed: false,
      code: "missing_destination_label",
      scope: "broad",
      reasonKo: "목적지가 아직 비어 있어요.",
    };
  }

  return {
    allowed: true,
    code: "onboarding_parallel_exception",
    source: "onboarding_bootstrap",
    scope: "broad",
    parallelNodeIds: [...TRAVEL_ONBOARDING_PARALLEL_NODE_IDS],
    destinationLabel,
  };
}
