import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export function resolveEventGlobeCoords(event: EventCandidate): {
  lat: number;
  lng: number;
  placeLabel: string;
} {
  const meta = event.metadata ?? {};
  const confirmedLat = meta.globePlaceLat;
  const confirmedLng = meta.globePlaceLng;
  if (
    meta.globePlaceConfirmed === true &&
    typeof confirmedLat === "number" &&
    typeof confirmedLng === "number" &&
    Number.isFinite(confirmedLat) &&
    Number.isFinite(confirmedLng)
  ) {
    const label =
      (typeof meta.globePlaceLabel === "string" && meta.globePlaceLabel.trim()) ||
      event.place?.trim() ||
      event.title.trim();
    return {
      lat: confirmedLat,
      lng: confirmedLng,
      placeLabel: label,
    };
  }

  const plan = readPlanContextFromEvent(event);
  const place = plan?.place?.trim() || event.place?.trim() || event.title.trim();
  const coords = resolvePlaceCoordinates(place || "한국");
  return {
    lat: coords.lat,
    lng: coords.lng,
    placeLabel: coords.label,
  };
}
