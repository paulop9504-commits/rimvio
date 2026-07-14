/**
 * Layer 4 — Context Condition AI (internal module)
 * Invoked by Operator (v2) — not shown to users.
 * Observe context · react to truth/signal · anchor conditions → pins.
 * User-facing name: Trip Assistant / Operator surface.
 * @see docs/RIMVIO_CANONICAL_VOCABULARY_V2.md
 * @see docs/RIMVIO_CONTRACT_SCHEMA.md — scout contract gate
 */
export {
  classifyContextConditionAnchorRequest,
  classifyContextConditionAnchorRequestFromEntities,
  filterLodgingRowsForContextCondition,
  filterLodgingRowsSimilarToAnchor,
  type ContextConditionAnchorPinIntent,
} from "@/lib/globe/context-condition-ai/classify-context-condition-anchor-request";
export {
  readContextConditionPinBatches,
  listContextConditionPlaceIdsForContext,
  type ContextConditionPinBatchRecord,
} from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
export {
  clearContextConditionLastBatch,
  isContextConditionLastBatchMisanchored,
  readContextConditionLastBatch,
  writeContextConditionLastBatch,
  type ContextConditionLastBatchWire,
} from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
export {
  discoverySurfaceIncludesLodging,
  discoverySurfaceIncludesLodgingForEvent,
  resolveDiscoverySurfaceIncludesLodgingFromBatch,
} from "@/lib/globe/context-condition-ai/discovery-surface-includes-lodging";
export {
  commitContextConditionHubBatch,
} from "@/lib/globe/context-condition-ai/commit-context-condition-hub-batch";
export {
  decorateEateryMarkersWithContextCondition,
  decorateLodgingMarkersWithContextCondition,
} from "@/lib/globe/context-condition-ai/decorate-context-condition-globe-markers";
export {
  mergeContextConditionEateryMarkers,
  mergeContextConditionLodgingMarkers,
  projectContextConditionEateryGlobeMarkers,
  projectContextConditionLodgingGlobeMarkers,
} from "@/lib/globe/context-condition-ai/project-context-condition-globe-markers";
export {
  runContextConditionAnchorPin,
  type ContextConditionAnchorPinInput,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai/run-context-condition-anchor-pin";
export {
  closeGlobeContextConditionPanel,
  openGlobeContextConditionPanel,
  publishGlobeTouchedContext,
  readGlobeTouchedContext,
  readGlobeTouchedContextEventId,
  subscribeGlobeContextConditionPanel,
  subscribeGlobeTouchedContext,
  toggleGlobeContextConditionPanel,
} from "@/lib/globe/context-condition-ai/globe-context-condition-panel-bridge";
export {
  dismissContextConditionPinBatch,
  listContextConditionPins,
  syncContextConditionPins,
} from "@/lib/globe/context-condition-ai/sync-context-condition-pins";
export {
  clearContextConditionPending,
  readContextConditionPending,
  writeContextConditionPending,
} from "@/lib/globe/context-condition-ai/context-condition-pending-spec-store";
export {
  clearScoutTurnConstraints,
  emptyScoutTurnConstraints,
  mergeScoutTurnConstraints,
  readScoutTurnConstraints,
  resolveAccumulatedEateryFocus,
  shouldCarryPriorEateryFocus,
  writeScoutTurnConstraints,
  type ScoutTurnConstraints,
} from "@/lib/globe/context-condition-ai/scout-turn-constraints";
export {
  parseUtteranceIntentSlots,
  utteranceHasConcreteDishSlot,
  normalizeScoutUtterance,
  type UtteranceIntentSlots,
} from "@/lib/globe/context-condition-ai/utterance-intent-slots";
export {
  parseFoodBrandFocus,
  hasFoodBrandCue,
} from "@/lib/globe/context-condition-ai/parse-food-brand-focus";
export { resolveDiscoveryOriginFromUtterance } from "@/lib/globe/context-condition-ai/resolve-discovery-origin-from-utterance";
export {
  buildContextConditionDiscoveryOverlay,
  resolveLocalDiscoveryRouteArcAltitude,
} from "@/lib/globe/context-condition-ai/build-context-condition-discovery-overlay";
export {
  clearContextConditionDiscoveryOverlay,
  publishContextConditionDiscoveryOverlay,
  readContextConditionDiscoveryOverlay,
  subscribeContextConditionDiscoveryOverlay,
} from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-bridge";
export type {
  ContextConditionDiscoveryOverlay,
  ContextConditionDiscoveryRing,
} from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-types";
export { evaluateContextConditionAutoReplan } from "@/lib/globe/context-condition-ai/evaluate-context-condition-auto-replan";
export type {
  ContextConditionAutoReplanOutcome,
  ContextConditionAutoReplanTrigger,
} from "@/lib/globe/context-condition-ai/evaluate-context-condition-auto-replan";
export {
  pinContextConditionRecommendation,
  readContextConditionPinnedPlaceIds,
} from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
export type {
  ContextConditionRecommendation,
  LocalDiscoveryActionSpec,
  LocalDiscoveryQuestion,
  LocalDiscoveryQuestionChoice,
  ResolveLocalDiscoveryActionResult,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
export {
  LOCAL_DISCOVERY_PIN_CAP,
  LOCAL_DISCOVERY_RECOMMEND_CAP,
  LOCAL_DISCOVERY_FEED_INVENTORY_CAP,
  LOCAL_DISCOVERY_LODGING_SCOUT_MAX,
} from "@/lib/globe/context-condition-ai/local-discovery-limits";
export {
  clearScoutRevealPending,
  consumeScoutRevealPending,
  hasScoutRevealPending,
  writeScoutRevealPending,
} from "@/lib/globe/context-condition-ai/context-condition-scout-reveal-pending-store";
export { revealContextConditionScout } from "@/lib/globe/context-condition-ai/reveal-context-condition-scout";
export { pickTopLocalDiscoveryRows } from "@/lib/globe/context-condition-ai/pick-top-local-discovery-rows";
export {
  applyQuestionChoice,
  isLocalDiscoveryRefinement,
  refineLocalDiscoverySpec,
  resolveLocalDiscoveryAction,
} from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
export {
  buildSpatialPatchPreview,
  planSpatialPatch,
} from "@/lib/globe/context-condition-ai/plan-spatial-patch";
export { resolveSpatialPatchKeptRows } from "@/lib/globe/context-condition-ai/resolve-spatial-patch-kept-rows";
export type {
  SpatialPatchPlan,
  SpatialPatchPreview,
  SpatialPatchScope,
  SpatialResourceKind,
} from "@/lib/globe/context-condition-ai/spatial-patch-types";
