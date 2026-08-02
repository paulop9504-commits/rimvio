export type {
  WorldGeoEntityId,
  WorldGeoKind,
  WorldGeoNode,
  WorldGeoLabels,
  RealitySyncSlice,
  RealitySyncLayers,
  RealityGraphResolveHit,
  WorldEngineId,
} from "@/lib/reality-graph/types";
export { REALITY_GRAPH_VERSION } from "@/lib/reality-graph/types";
export {
  WORLD_GEO_SEED,
  getWorldGeoNode,
  listWorldGeoChildren,
  listWorldGeoSeed,
} from "@/lib/reality-graph/world-geo-seed";
export {
  resolveWorldGeoEntity,
  resolveWorldGeoById,
  resolveWorldGeoNearCoords,
  walkAncestors,
  walkHierarchyPath,
} from "@/lib/reality-graph/resolve-world-geo";
export {
  answerAdminDivisionQuestion,
  formatWorldGeoHierarchyKo,
  formatWorldGeoHierarchyEn,
} from "@/lib/reality-graph/answer-admin-division";
export {
  buildRealitySyncSlice,
  REALITY_SYNC_INTERVAL_MS,
} from "@/lib/reality-graph/reality-sync";
export {
  WORLD_ENGINE_IDS,
  worldEngineLookup,
  worldEngineLookupCoords,
} from "@/lib/reality-graph/world-engine";
export {
  projectWorldGeoToPlaceFields,
  enrichCanonicalPlaceProfileFromRealityGraph,
} from "@/lib/reality-graph/project-to-place-profile";

/** Entity Graph Engine — Hotel/Flight/… + relations (Workspace refs entities) */
export type {
  RealityEntity,
  RealityEntityId,
  RealityEntityState,
  RealityEntityType,
} from "@/lib/reality-graph/entity-types";
export {
  REALITY_ENTITY_TYPES,
  workspaceKindToEntityType,
} from "@/lib/reality-graph/entity-types";
export type {
  RealityRelation,
  RealityRelationKind,
  Relation,
} from "@/lib/reality-graph/relation-types";
export { REALITY_RELATION_KINDS } from "@/lib/reality-graph/relation-types";

/** STEP 3 facades — entity.ts · relation.ts */
export type { RealityEntityView } from "@/lib/reality-graph/entity";
export {
  createEntity,
  entityDisplayName,
  entityFromMapsPoi,
  listEntityRelationIds,
  readEntityView,
  setEntityState,
  toEntityView,
} from "@/lib/reality-graph/entity";
export type { CoreRealityRelationKind } from "@/lib/reality-graph/relation";
export {
  CORE_REALITY_RELATIONS,
  createRelation,
  relateConnectedTo,
  relateLocatedNear,
  relatePartOf,
  relateSimilarTo,
  relateUsedIn,
} from "@/lib/reality-graph/relation";

export {
  addRealityRelation,
  assertEntityReferenceOnly,
  clearRealityGraphForTests,
  getRealityEntity,
  getRealityRelation,
  listOutgoingRelations,
  listRealityEntities,
  listRealityRelations,
  updateRealityEntityState,
  upsertRealityEntity,
} from "@/lib/reality-graph/graph-store";
export type {
  ConnectedEntityLine,
  GraphPath,
  NearbyEntityHit,
  RelatedEntityHit,
} from "@/lib/reality-graph/graph-query";
export {
  findLocatedNear,
  findNearby,
  findPath,
  findSimilar,
  getRelatedEntities,
  listConnected,
  listUsedInContexts,
  nearby,
  path,
  related,
  similar,
} from "@/lib/reality-graph/graph-query";
