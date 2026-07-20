export type {
  VisualSubjectKind,
  VisualScoreBreakdown,
  VisualCandidate,
  VisualProjectionSelection,
  VisualProjectionLod,
  ObjectHaloFamily,
  ObjectHaloStyle,
  ProjectionTier,
  ResolveMarkerLodInput,
} from "@/lib/visual-projection/types";
export {
  resolveObjectHaloStyle,
  resolveObjectHaloStyleFromPinKind,
  haloFamilyForObjectType,
} from "@/lib/visual-projection/object-halo";
export { inferVisualSubject } from "@/lib/visual-projection/infer-visual-subject";
export { representativenessStars } from "@/lib/visual-projection/representativeness";
export {
  scoreVisualCandidate,
  selectProjectionVisual,
  selectProjectionVisualUrl,
  selectProjectionVisualWithSegmentation,
  type VisualProjectionSelectionWithGate,
} from "@/lib/visual-projection/select-projection-visual";
export {
  resolveVisualProjectionLod,
  resolveMarkerVisualLod,
} from "@/lib/visual-projection/resolve-marker-lod";
export {
  listContextProjectionPlaceIds,
  resolveProjectionTierForPlace,
  filterMarkersByContextProjection,
} from "@/lib/visual-projection/filter-context-projection";
export {
  applyObjectProjectionDomStyle,
  createObjectGlyphElement,
  createObjectHaloElement,
} from "@/lib/visual-projection/apply-object-projection-dom";
export { resolveProjectedObjectVisual } from "@/lib/visual-projection/resolve-projected-object-visual";
export { mountRealityObjectMarkerVisual } from "@/lib/visual-projection/mount-reality-object-marker-visual";
export { visualLayerRuleForType } from "@/lib/visual-projection/visual-layer-rules";
export { decideSegmentation } from "@/lib/visual-projection/decide-segmentation";
export type { SegmentationDecision } from "@/lib/visual-projection/decide-segmentation";
export {
  runSelectiveSegmentation,
  resolveCutoutPresentationMode,
  clearSelectiveSegmentationCache,
  readSelectiveSegmentationCacheSize,
  type CutoutPresentationMode,
  type SelectiveSegmentationResult,
} from "@/lib/visual-projection/run-selective-segmentation";
export type {
  BloomRelationKind,
  ContextBloomRole,
  ContextBloomCandidate,
  ContextBloomRelatedHit,
  ContextBloomSession,
  ContextBloomMarkerDecor,
} from "@/lib/visual-projection/context-bloom-types";
export { rankContextBloomRelations } from "@/lib/visual-projection/rank-context-bloom-relations";
export { projectContextBloomArcs } from "@/lib/visual-projection/project-context-bloom-arcs";
export {
  subscribeContextBloom,
  readContextBloomSession,
  clearContextBloom,
  startContextBloom,
  resolveContextBloomDecor,
  readContextBloomArcsVisible,
  isContextBloomExecutionReady,
  CONTEXT_BLOOM_ARC_VISIBLE_MS,
  type ContextBloomPhase,
  type ContextBloomSessionLive,
} from "@/lib/visual-projection/context-bloom-store";
export {
  lodgingMarkersToBloomCandidates,
  eateryMarkersToBloomCandidates,
  decorateLodgingMarkersWithBloom,
  decorateEateryMarkersWithBloom,
} from "@/lib/visual-projection/decorate-markers-with-context-bloom";
export {
  resolveContextEventIdFromResourceId,
  capabilitiesForBloomCandidate,
  shouldShowContextBloomExecutionStrip,
  gateBloomExecutionHandlers,
  runContextBloomAddToInbox,
  openBloomDirectionsUrl,
  bloomCandidatePlaceKind,
} from "@/lib/visual-projection/run-context-bloom-execution";
