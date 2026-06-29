import type { PlaceCandidateEnriched } from "@/lib/context-resolver/places/types";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

export function placeDiscoveryGlobePinId(placeId: string): string {
  return `plc:${placeId.trim()}`;
}

export function projectPinClusterFromPlaceCandidate(
  place: Pick<
    PlaceCandidateEnriched,
    "place_id" | "name" | "lat" | "lng" | "reason"
  >,
): PinCluster {
  const pinId = placeDiscoveryGlobePinId(place.place_id);
  return {
    pinId,
    eventId: pinId,
    title: place.name,
    placeLabel: place.name,
    lat: place.lat,
    lng: place.lng,
    dateLabel: null,
    startedAtIso: new Date().toISOString(),
    evidence: {
      photoCount: 0,
      videoCount: 0,
      chatCount: 0,
      placePinCount: 1,
    },
    recallLine: place.reason?.slice(0, 72) ?? null,
    origin: "external",
    externalTraceId: place.place_id,
    readOnly: true,
    authorDisplayName: null,
  };
}

export function projectPlaceDiscoveryPinClusters(
  places: readonly Pick<
    PlaceCandidateEnriched,
    "place_id" | "name" | "lat" | "lng" | "reason"
  >[],
): PinCluster[] {
  return places.map(projectPinClusterFromPlaceCandidate);
}
