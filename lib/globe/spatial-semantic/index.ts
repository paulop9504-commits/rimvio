export type {
  GeoOntologyEdge,
  GeoOntologyFacetId,
  GeoOntologyFacetState,
  GeoOntologyGraph,
  GeoOntologyNode,
  GeoOntologyNodeKind,
} from "@/lib/globe/spatial-semantic/types";
export { rankPlacesByGeoOntologyFacet } from "@/lib/globe/spatial-semantic/apply-geo-ontology-facet";
export {
  buildClarifyingOntologyGraph,
  buildContextDiscoveryOntologyGraph,
} from "@/lib/globe/spatial-semantic/build-context-discovery-ontology-graph";
export {
  clearGeoOntologyGraph,
  highlightGeoOntologyPlace,
  publishGeoOntologyFacetState,
  publishGeoOntologyGraph,
  readGeoOntologyFacetState,
  readGeoOntologyGraph,
  subscribeGeoOntologyFacetState,
  subscribeGeoOntologyGraph,
} from "@/lib/globe/spatial-semantic/geo-ontology-graph-store";
export { filterPinClustersForLayerPolicy } from "@/lib/globe/spatial-semantic/filter-pin-clusters-for-layer-policy";
export {
  publishContextOnlyGlobeProjection,
  publishFoldedGlobeProjection,
  publishFocusGlobeProjection,
  publishGlobeProjectionLayerPolicy,
  readGlobeProjectionLayerPolicy,
  resetGlobeProjectionLayerPolicy,
  subscribeGlobeProjectionLayerPolicy,
} from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
export type {
  GlobeProjectionLayerMode,
  GlobeProjectionLayerPolicy,
} from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
export {
  filterContextConditionMarkersByPlaceIds,
  shouldProjectContextConditionMarkers,
  shouldShowContextConditionDiscoveryOverlay,
} from "@/lib/globe/spatial-semantic/resolve-context-condition-marker-visibility";
export {
  applyPalantirOperatorFacetRefine,
  applyPalantirOperatorAfterScout,
  applyPalantirOperatorPlaceOverride,
  buildPalantirOperatorBrief,
  buildPalantirProvenanceLine,
  pickPalantirProjectedRecommendations,
  resolvePalantirProjectionCount,
} from "@/lib/globe/spatial-semantic/palantir-workspace-operator";
export type { PalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-operator";
export {
  clearPalantirWorkspaceSnapshot,
  publishPalantirWorkspaceSnapshot,
  readPalantirWorkspaceSnapshot,
  subscribePalantirWorkspaceSnapshot,
} from "@/lib/globe/spatial-semantic/palantir-workspace-store";
export {
  parsePalantirFacetFromMessage,
  resolvePalantirExcludePlaceIds,
  resolvePalantirRefineIntent,
} from "@/lib/globe/spatial-semantic/resolve-palantir-refine-intent";
export type { PalantirRefineIntent } from "@/lib/globe/spatial-semantic/resolve-palantir-refine-intent";
export { isPalantirOntologyDevSurfaceEnabled } from "@/lib/globe/spatial-semantic/palantir-ontology-dev-surface";
export { resolvePalantirAutoFacet } from "@/lib/globe/spatial-semantic/resolve-palantir-auto-facet";
export { executePalantirCommit } from "@/lib/globe/spatial-semantic/execute-palantir-commit";
export {
  openPalantirCommitAction,
  resolvePalantirCommitAction,
} from "@/lib/globe/spatial-semantic/resolve-palantir-commit-action";
export type {
  PalantirCommitAction,
  PalantirCommitActionKind,
} from "@/lib/globe/spatial-semantic/resolve-palantir-commit-action";
export {
  clearPalantirOntologyHistory,
  hasPalantirOntologyHistory,
  readPalantirOntologyHistory,
  readPalantirOntologyHistoryHead,
  recordPalantirOntologyHistory,
  restorePalantirOntologyHead,
  subscribePalantirOntologyHistory,
} from "@/lib/globe/spatial-semantic/palantir-ontology-history-store";
export type {
  PalantirOntologyHistoryEntry,
  PalantirOntologyHistoryKind,
} from "@/lib/globe/spatial-semantic/palantir-ontology-history-store";
