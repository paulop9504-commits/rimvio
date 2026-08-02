/**
 * Spatial Retrieval Pipeline
 *
 * User Command → Intent → Context → Anchor → Query Engine → Reality Graph →
 * Workspace Projection → Context Aware Callout → Draft → Commit
 */

export type {
  SpatialAnchorCandidateProjection,
  SpatialAnchorEntity,
  SpatialAnchorResolved,
  SpatialAnchorResolveAmbiguous,
  SpatialAnchorResolveOk,
  SpatialAnchorResolveSource,
  SpatialCalloutAction,
  SpatialCalloutActionId,
  SpatialCalloutEvidence,
  SpatialCalloutRelationship,
  SpatialCalloutSeed,
  SpatialContextAwareCallout,
  SpatialContextRef,
  SpatialContextScoreBreakdown,
  SpatialDiscoveryConstraints,
  SpatialDiscoveryIntent,
  SpatialDraftEdge,
  SpatialEntityResolverResult,
  SpatialProjectionEvent,
  SpatialProjectionPipelineStage,
  SpatialProjectionPin,
  SpatialQueryEngineOutput,
  SpatialQueryRankingAxis,
  SpatialQuerySpec,
  SpatialRealityEntity,
  SpatialRealityRelationship,
  SpatialRelation,
  SpatialRelationEdge,
  SpatialRetrievedEntity,
  SpatialRetrievalInput,
  SpatialRetrievalLogLine,
  SpatialRetrievalResult,
  SpatialRetrievalStage,
  SpatialTargetEntity,
} from "@/lib/spatial-retrieval/types";

export {
  SPATIAL_ANCHOR_ENTITIES,
  SPATIAL_CONTEXT_SCORE_WEIGHTS,
  SPATIAL_DISCOVERY_TYPE,
  SPATIAL_PROJECTION_PIPELINE,
  SPATIAL_QUERY_RANKING,
  SPATIAL_RELATIONS,
  SPATIAL_TARGET_ENTITIES,
} from "@/lib/spatial-retrieval/types";

export {
  isSpatialDiscoveryIntent,
  parseSpatialDiscoveryIntent,
} from "@/lib/spatial-retrieval/intent-parser";

export { resolveSpatialContext } from "@/lib/spatial-retrieval/context-resolver";

export {
  projectAnchorCandidates,
  resolveSpatialAnchor,
  resolveSpatialAnchorDetailed,
  toEntityResolverResult,
  type SpatialAnchorCandidate,
} from "@/lib/spatial-retrieval/anchor-resolver";

export {
  applySpatialQueryRanking,
  buildSpatialQuery,
  rankByContextScore,
  relationDefaultRadius,
  scoreSpatialContext,
  toSpatialQueryEngineOutput,
} from "@/lib/spatial-retrieval/spatial-query-builder";

export { retrieveSpatialEntities } from "@/lib/spatial-retrieval/entity-retrieval";

export {
  buildRealityEntities,
  extractRealityRelationships,
  formatRealityGraphSketch,
  generateSpatialRelations,
  toRealityEntityFromAnchor,
  toRealityEntityFromRetrieved,
  toRealityRelationship,
} from "@/lib/spatial-retrieval/reality-graph";

export { projectSpatialPins } from "@/lib/spatial-retrieval/workspace-projection";

export { emitSpatialProjectionEvents } from "@/lib/spatial-retrieval/projection-events";

export {
  buildContextAwareCallout,
  buildSpatialCalloutSeeds,
  formatContextAwareCalloutSketch,
} from "@/lib/spatial-retrieval/callout-renderer";

export {
  createScheduleDraftEdge,
  isPreCommitDraft,
} from "@/lib/spatial-retrieval/draft-edge";

export {
  applySpatialSessionTurn,
  createSpatialSession,
  type SpatialSessionPhase,
  type SpatialSessionState,
  type SpatialSessionTurnResult,
} from "@/lib/spatial-retrieval/spatial-session";

export { runSpatialRetrieval } from "@/lib/spatial-retrieval/run-spatial-retrieval";
