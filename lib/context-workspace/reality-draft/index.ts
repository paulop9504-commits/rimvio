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
  compareTripDayParts,
} from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
export type {
  TripEntitySlot,
  TripEntitySlotKind,
  TripDayPart,
  TripSlotInventory,
  MaterializeTripDraftResult,
} from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
export {
  burstFillTripInventory,
  burstFillTripInventoryAsync,
  burstFillTripInventoryViaTools,
} from "@/lib/context-workspace/reality-draft/burst-fill-trip-inventory";
export {
  planTripDayClusters,
  clusterForDay,
} from "@/lib/context-workspace/reality-draft/trip-day-clusters";
export type { TripDayCluster } from "@/lib/context-workspace/reality-draft/trip-day-clusters";
export {
  refineTripDraftStops,
  refineTripDraftRoute,
  refineTripDraftWeatherSwap,
  estimateWalkMinutes,
  TRIP_DRAFT_MAX_LEG_MINUTES,
  utteranceSuggestsRain,
} from "@/lib/context-workspace/reality-draft/refine-trip-draft-stops";
export { guideWebSeedHits } from "@/lib/context-workspace/reality-draft/guide-web-seed-hits";
export type { TripDraftStop } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
export { OSAKA_TRIP_DRAFT_STOPS } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
