/**
 * Rimvio Dev Agent OS — public API.
 * Canonical: docs/RIMVIO_DEV_AGENT_OS.md
 */

export {
  RIMVIO_DEV_DEVELOPMENT_LOOP,
  DEV_DEVELOPMENT_PHASE_LABEL_KO,
  type DevDevelopmentPhase,
  type DevTaskKind,
  type RimvioPlatformModel,
  type RimvioCapabilityModel,
  type RimvioLoopModel,
  type RimvioWorkspaceModel,
  type CurrentSystemState,
  type ProductIntentDecomposition,
  type DevAgentTaskPlan,
  type DefinitionOfDoneChecklist,
} from "@/lib/hub/dev/dev-agent-os/types";

export {
  mapDevPhaseToPlatformPhase,
  DEV_LOOP_REQUIRED_FOR_PRODUCT_WORK,
  DEV_LOOP_REQUIRED_FOR_DEPLOY,
} from "@/lib/hub/dev/dev-agent-os/development-loop";

export {
  classifyDevTask,
  devTaskToUserIntent,
  type ClassifiedDevTask,
} from "@/lib/hub/dev/dev-agent-os/task-classification";

export {
  decomposeProductIntent,
  buildDevAgentTaskPlan,
  platformsAffectedByCapability,
} from "@/lib/hub/dev/dev-agent-os/object-model";

export {
  DEFINITION_OF_DONE_KEYS,
  requiredDoneChecks,
  isDefinitionOfDoneComplete,
  emptyDefinitionOfDone,
  DEV_AGENT_SUCCESS_QUESTION,
} from "@/lib/hub/dev/dev-agent-os/definition-of-done";
