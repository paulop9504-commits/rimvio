/**
 * Spatial Retrieval Pipeline
 *
 * User Command → Intent → Context → Anchor → Query → Entities → Relations → Projection → Callout
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
  SpatialDiscoveryConstraints,
  SpatialDiscoveryIntent,
  SpatialEntityResolverResult,
  SpatialProjectionPin,
  SpatialQuerySpec,
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
  SPATIAL_DISCOVERY_TYPE,
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

export { buildSpatialQuery } from "@/lib/spatial-retrieval/spatial-query-builder";

export { retrieveSpatialEntities } from "@/lib/spatial-retrieval/entity-retrieval";

export { generateSpatialRelations } from "@/lib/spatial-retrieval/relationship-generator";

export { projectSpatialPins } from "@/lib/spatial-retrieval/workspace-projection";

export { buildSpatialCalloutSeeds } from "@/lib/spatial-retrieval/callout-renderer";

export { runSpatialRetrieval } from "@/lib/spatial-retrieval/run-spatial-retrieval";
