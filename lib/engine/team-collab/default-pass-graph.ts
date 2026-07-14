import type { RimvioEngineId } from "@/lib/engine/engine-types";

/**
 * Default travel formation — who receives the ball after a successful touch.
 * Plan schedule still outranks this when an Execution Plan step is `running`.
 */
export const DEFAULT_TRAVEL_ENGINE_PASS_GRAPH: Readonly<
  Partial<Record<RimvioEngineId, RimvioEngineId>>
> = {
  lodging_search: "eatery_search",
  eatery_search: "activity_search",
  activity_search: "transit_navigate",
  local_amenity_search: "eatery_search",
  trip_experience_search: "lodging_search",
  flight_booking: "lodging_search",
  transit_navigate: "finance_prep",
};

export function resolveDefaultPassReceiver(
  fromEngineId: RimvioEngineId,
): RimvioEngineId | null {
  return DEFAULT_TRAVEL_ENGINE_PASS_GRAPH[fromEngineId] ?? null;
}
