export type {
  IntentConfidence,
  IntentContextState,
  IntentDomain,
  IntentRoute,
  IntentSurface,
  InteractionMode,
} from "@/lib/intent-router/types";
export { INTERACTION_MODES, INTENT_DOMAINS } from "@/lib/intent-router/types";
export { resolveIntentRoute } from "@/lib/intent-router/resolve-intent-route";
export {
  buildIntentPlan,
  formatIntentPlanDraftReply,
  type IntentPlan,
  type IntentPlanEntity,
  type IntentPlanGoal,
} from "@/lib/intent-router/build-intent-plan";
export {
  clearPendingCreateProject,
  isCreateProjectAffirmUtterance,
  isCreateProjectRejectUtterance,
  readPendingCreateProject,
  writePendingCreateProject,
  type PendingCreateProject,
} from "@/lib/intent-router/pending-create-project-store";
export {
  tryResolvePendingCreateProject,
  tryRunIntentRouterHardCreateOpen,
  tryRunIntentRouterSoftCreateOffer,
} from "@/lib/intent-router/try-run-intent-router-gate";
