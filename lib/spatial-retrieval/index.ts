/**
 * Spatial Retrieval Pipeline
 *
 * User Command → Intent → Context → Anchor → Query Engine → Reality Graph → Projection
 */

export type {
  SpatialAnchorCandidateProjection,
  SpatialAnchorEntity,
  SpatialAnchorResolved,
  SpatialAnchorResolveAmbiguous,
  SpatialAnchorResolveOk,
  SpatialAnchorResolveSource,
  SpatialCalloutSeed,
  SpatialContextRef,
  SpatialContextScoreBreakdown,
  SpatialDiscoveryConstraints,
  SpatialDiscoveryIntent,
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

export { buildSpatialCalloutSeeds } from "@/lib/spatial-retrieval/callout-renderer";

export { runSpatialRetrieval } from "@/lib/spatial-retrieval/run-spatial-retrieval";
