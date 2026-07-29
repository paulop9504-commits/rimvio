export {
  WORK_BECOMES_CONTEXT_SLOGAN,
  WORKSTREAM_PIPELINE,
  WORKSTREAM_UNTITLED,
  WORKSTREAM_SCRATCH_LABELS,
  REALITY_RESIDUE_LAYERS,
  SELECTION_CANDIDATE_CONFIDENCE,
  isScratchWorkstreamTitle,
  residueLayerForEventKind,
} from "@/lib/workstream/types";
export type {
  WorkstreamEvent,
  WorkstreamEventKind,
  WorkstreamPipelineStage,
  WorkstreamState,
  RealityResidueLayer,
} from "@/lib/workstream/types";
export { isEphemeralWorkUtterance } from "@/lib/workstream/is-ephemeral-work";
export { inferWorkstreamTitle } from "@/lib/workstream/infer-workstream-title";
export {
  ensureWorkstream,
  readWorkstream,
  writeWorkstream,
} from "@/lib/workstream/workstream-store";
export {
  appendWorkstreamEvent,
  recordBudgetUpdated,
  recordFlightCommitted,
  recordHotelCommitted,
  recordHotelSelected,
  recordRestaurantAdded,
  recordScheduleUpdated,
} from "@/lib/workstream/append-workstream-event";
export {
  observationIsNotDecision,
  resolveRealityResidueLayer,
} from "@/lib/workstream/reality-residue-layer";
export {
  TRIP_STAY_SEGMENTS_META_KEY,
  buildTripStayTimeline,
  expandTripPeriodFromSegments,
  mergeTripStaySegment,
  readTripStaySegments,
} from "@/lib/workstream/build-stay-timeline";
export type {
  TripStaySegment,
  TripStayTimelineDay,
  TripStayTimelineDayKind,
} from "@/lib/workstream/build-stay-timeline";
export { computeContextCompleteness } from "@/lib/workstream/compute-context-completeness";
export type {
  ContextCompleteness,
  ContextCompletenessGap,
  ContextCompletenessGapId,
} from "@/lib/workstream/compute-context-completeness";
export { promoteRealityCommitToContextGraph } from "@/lib/workstream/promote-reality-commit";
export {
  filterTripIntakeGapsByConfirmedReality,
  resolveConfirmedRealityAskGate,
  shouldSkipTravelSlotAsk,
} from "@/lib/workstream/resolve-confirmed-reality-ask-gate";
export type {
  ConfirmedRealityAskGate,
  ConfirmedRealityAskSlot,
  ConfirmedRealityKnownFacts,
} from "@/lib/workstream/resolve-confirmed-reality-ask-gate";
