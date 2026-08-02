/**
 * Rimvio Object Callout — Control Surface on Reality Entities.
 */

export type {
  CalloutAction,
  CalloutActionKind,
  CalloutConnectTarget,
  CalloutEvidence,
  CalloutEvidenceLayer,
  CalloutExploreEdge,
  CalloutHandlers,
  CalloutIntentAxis,
  CalloutMode,
  CalloutObjectTypeDescriptor,
  CalloutPrepareStep,
  CalloutSimulationDelta,
  CalloutViewModel,
  Evidence,
  EvidenceGraphRef,
  EvidenceType,
  RimvioObject,
  RimvioObjectLocation,
  RimvioObjectState,
  RimvioObjectType,
} from "@/lib/callout/types";
export {
  CALLOUT_MODES,
  EVIDENCE_TYPES,
  RIMVIO_OBJECT_STATES,
  RIMVIO_OBJECT_TYPES,
} from "@/lib/callout/types";

export {
  CALLOUT_MODE_LABEL_KO,
  getCalloutObjectTypeDescriptor,
  listCalloutObjectTypes,
  OBJECT_STATE_LABEL_KO,
  registerCalloutObjectType,
} from "@/lib/callout/callout-registry";

export {
  buildCalloutViewModel,
  calloutModeLabelKo,
  type CalloutGraphAlternative,
  type CalloutGraphNeighbor,
} from "@/lib/callout/build-callout-model";

export {
  buildObserveEvidence,
  evidenceHighlightLineCoords,
  scoreObserveAiScore,
} from "@/lib/callout/build-observe-evidence";

export {
  resolveRimvioObjectState,
  rimvioObjectFromWorkspaceNode,
  workspaceKindToRimvioObjectType,
} from "@/lib/callout/resolve-rimvio-object";

export { useCalloutState } from "@/lib/callout/hooks/useCalloutState";

export {
  buildCalloutAlternativesFromWorkspace,
  buildCalloutNeighborsFromWorkspace,
  buildRimvioObjectFromWorkspace,
} from "@/lib/callout/from-workspace";

export {
  buildObjectRelationContextFromWorkspace,
  getAllRelationBuckets,
  getRelations,
  OBJECT_RELATION_TYPE_LABEL_KO,
  OBJECT_RELATION_TYPES,
  resolveObjectRelationRole,
  type ObjectRelation,
  type ObjectRelationContext,
  type ObjectRelationRole,
  type ObjectRelationType,
} from "@/lib/callout/object-relation";
