/**
 * Container AI — Operator surface orchestrating internal modules.
 * @see docs/RIMVIO_CONTAINER_AI.md
 */

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
