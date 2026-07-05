/**
 * Operator — user-facing Runtime AI (v2). Replaces "Container AI" in vocabulary.
 * @see docs/RIMVIO_CANONICAL_VOCABULARY_V2.md
 */

export {
  CONTAINER_AI_MODULES as OPERATOR_MODULES,
  CONTAINER_AI_USER_LABELS as OPERATOR_USER_LABELS,
  type ContainerAICapabilityOffer as OperatorCapabilityOffer,
  type ContainerAIContext as OperatorContext,
  type ContainerAIGateOutcome as OperatorGateOutcome,
  type ContainerAIModule as OperatorModule,
  type ContainerAINodeSummary as OperatorNodeSummary,
  type ContainerAIUserLabelKey as OperatorUserLabelKey,
} from "@/lib/container-ai/types";

export {
  gateContainerAIRequest as gateOperatorRequest,
  readContainerAIContext as readOperatorContext,
  readContainerAIUserLabel as readOperatorUserLabel,
} from "@/lib/container-ai";

/** @deprecated v1 — use Operator */
export {
  gateContainerAIRequest,
  readContainerAIContext,
  readContainerAIUserLabel,
} from "@/lib/container-ai";
