/**
 * Layer 4 — Context Condition AI (internal module)
 * Invoked by Operator (v2) — not shown to users.
 * Observe context · react to truth/signal · anchor conditions → pins.
 * User-facing name: Trip Assistant / Operator surface.
 * @see docs/RIMVIO_CANONICAL_VOCABULARY_V2.md
 */
export {
  classifyContextConditionAnchorRequest,
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
  readContextConditionLastBatch,
  writeContextConditionLastBatch,
  type ContextConditionLastBatchWire,
} from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
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
