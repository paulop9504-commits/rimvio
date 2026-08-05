/**
 * Workspace Projection Layer — Decision observation over map (not Sheet flags).
 */

export type {
  CompareDecisionCriteriaWeights,
  CompareDecisionRelationship,
  CompareDecisionState,
  DecisionProjection,
  DecisionProjectionAction,
  DecisionProjectionScores,
  WorkspaceProjectionMode,
  WorkspaceProjectionState,
} from "@/lib/context-workspace/projection/types";

export {
  DEFAULT_COMPARE_CRITERIA_WEIGHTS,
  TRIP_CONTEXT_COMPARE_WEIGHTS,
  WORKSPACE_PROJECTION_MODES,
} from "@/lib/context-workspace/projection/types";

export {
  buildDecisionProjection,
  buildDecisionProjectionsForCompare,
  resolveCompareCriteriaWeights,
} from "@/lib/context-workspace/projection/build-decision-projection";

export {
  buildIntentDecisionFacetProjection,
  buildWorkspaceIntentLabelKo,
  intentFacetToDetail,
  resolveIntentCriteriaWeights,
  type IntentDecisionFacet,
  type IntentDecisionFacetProjection,
  type IntentWeightBar,
} from "@/lib/context-workspace/projection/build-intent-decision-facets";

export {
  buildObjectDecisionSpokes,
  spokeOffsetPx,
  type ObjectDecisionSpoke,
  type ObjectDecisionSpokeSet,
} from "@/lib/context-workspace/projection/build-object-decision-spokes";

export {
  buildSpatialDecisionOverlay,
  type SpatialDecisionBadge,
  type SpatialDecisionOverlay,
} from "@/lib/context-workspace/projection/build-spatial-decision-overlay";

export {
  buildCompareRelationshipEdges,
  buildEntityTitleMap,
  collectCompareRelationshipEntityIds,
  fromCompareDecisionRelationship,
  shortenRelationshipLabel,
} from "@/lib/context-workspace/projection/build-compare-relationship-edges";
export type { CompareRelationshipEdge } from "@/lib/context-workspace/projection/build-compare-relationship-edges";

export {
  COMPARE_INTENT_TARGETS,
  compareTargetToWorkspaceDomain,
  isCompareIntentUtterance,
  parseCompareIntent,
  workspaceDomainToCompareTarget,
} from "@/lib/context-workspace/projection/compare-intent";
export type {
  CompareIntent,
  CompareIntentTarget,
} from "@/lib/context-workspace/projection/compare-intent";

export {
  resolveCompareCandidateEntityIds,
  runCompareDecisionPipeline,
} from "@/lib/context-workspace/projection/run-compare-decision-pipeline";
export type { CompareDecisionPipelineResult } from "@/lib/context-workspace/projection/run-compare-decision-pipeline";

export { tryEnterCompareDecisionAfterRefine } from "@/lib/context-workspace/projection/try-enter-compare-after-refine";

export { applyCompareDecisionSelection } from "@/lib/context-workspace/projection/apply-compare-decision-selection";
export type { ApplyCompareDecisionSelectionResult } from "@/lib/context-workspace/projection/apply-compare-decision-selection";

export {
  clearWorkspaceProjectionForTests,
  enterCompareDecisionProjection,
  exitCompareDecisionProjection,
  getWorkspaceProjectionMode,
  isCompareDecisionProjectionActive,
  readWorkspaceProjection,
  selectCompareDecisionEntity,
  subscribeWorkspaceProjection,
  syncCompareDecisionProjectionFromWorkspace,
} from "@/lib/context-workspace/projection/compare-decision-state";

export { useWorkspaceProjection } from "@/lib/context-workspace/projection/use-workspace-projection";
