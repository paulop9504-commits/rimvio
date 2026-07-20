import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  findRealityObjectByPlaceId,
  listRealityObjects,
} from "@/lib/reality-object/store";
import type { RealityObjectV1 } from "@/lib/reality-object/types";

/** Resolve Reality Object for a bloom/map resource id or place id. */
export function resolveRealityObjectForCard(input: {
  event?: EventCandidate | null;
  resourceId?: string | null;
  placeId?: string | null;
}): RealityObjectV1 | null {
  const resourceId = input.resourceId?.trim();
  if (resourceId) {
    const byResource = listRealityObjects(input.event).find((row) => {
      const meta = row.metadata?.resourceId;
      return (
        row.id === `ro:${resourceId}` ||
        (typeof meta === "string" && meta.trim() === resourceId)
      );
    });
    if (byResource) {
      return byResource;
    }
  }
  const placeId = input.placeId?.trim();
  if (placeId) {
    return findRealityObjectByPlaceId(input.event, placeId);
  }
  return null;
}
