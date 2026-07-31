export {
  buildRealityDraft,
  findRealityDraftDayForNode,
  findRealityDraftNode,
} from "@/lib/context-workspace/reality-draft/build-reality-draft";
export type {
  RealityDraft,
  RealityDraftDay,
  RealityDraftEntityKind,
  RealityDraftNodeRef,
} from "@/lib/context-workspace/reality-draft/build-reality-draft";
export {
  compileTripEntitySlots,
  materializeTripDraftStops,
  resolveTripDayCount,
  resolveDestinationAnchor,
  seedOsakaStopsForDays,
} from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
export type {
  TripEntitySlot,
  TripEntitySlotKind,
} from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
export type { TripDraftStop } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
export { OSAKA_TRIP_DRAFT_STOPS } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
