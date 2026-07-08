export {
  CONTAINER_AI_MODULES,
  CONTAINER_AI_USER_LABELS,
  type ContainerAICapabilityOffer,
  type ContainerAIContext,
  type ContainerAIGateOutcome,
  type ContainerAIModule,
  type ContainerAINodeSummary,
  type ContainerAIUserLabelKey,
} from "@/lib/container-ai/types";

export {
  readContainerAIContext,
  readContainerAIUserLabel,
} from "@/lib/container-ai/read-container-ai-context";

export { gateContainerAIRequest } from "@/lib/container-ai/gate-container-ai-request";

export {
  evaluateOnboardingParallelException,
  hasDateRangeSignal,
  hasDelegationSignal,
  hasFirstVisitSignal,
  hasNarrowCategorySignal,
  hasTripFrameSignal,
  type OnboardingParallelExceptionInput,
  type OnboardingParallelExceptionResult,
} from "@/lib/container-ai/evaluate-onboarding-parallel-exception";

export {
  classifyTravelRequestScope,
  type TravelRequestScope,
  type TravelRequestScopeResult,
} from "@/lib/container-ai/classify-travel-request-scope";

export {
  buildOnboardingParallelMapScouts,
  onboardingParallelIncludesDeparture,
  type OnboardingParallelMapScout,
} from "@/lib/container-ai/build-onboarding-parallel-specs";

export {
  runOnboardingParallelMapScouts,
  type OnboardingParallelScoutRunInput,
  type OnboardingParallelScoutRunResult,
} from "@/lib/container-ai/run-onboarding-parallel-scouts";

export {
  clearTravelOnboardingBootstrap,
  markTravelOnboardingBootstrapUsed,
  readTravelOnboardingBootstrap,
  type TravelOnboardingBootstrapOverlay,
} from "@/lib/container-ai/travel-onboarding-bootstrap-store";
