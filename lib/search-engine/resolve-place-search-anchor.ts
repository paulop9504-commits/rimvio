/**
 * Resolve search lat/lng for lodging/eatery — prefer Context destination over Daejeon default.
 */

import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { resolveWorldGeoEntity } from "@/lib/reality-graph/resolve-world-geo";

export type PlaceSearchAnchor = {
  readonly lat: number;
  readonly lng: number;
  readonly via: "input" | "event_meta" | "destination_label" | "query_geo";
};

function finitePair(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { lat: number; lng: number } | null {
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  return { lat, lng };
}

function anchorFromLabel(label: string): { lat: number; lng: number } | null {
  const text = label.trim();
  if (!text) return null;
  const geo = resolveWorldGeoEntity(text);
  if (geo?.node.centroid) {
    return { lat: geo.node.centroid.lat, lng: geo.node.centroid.lng };
  }
  const overseas = classifyOverseasManualPlace(text);
  if (overseas) {
    return { lat: overseas.lat, lng: overseas.lng };
  }
  return null;
}

/**
 * Pick search origin for live place search.
 * Never invent a Korean default when a trip destination is known.
 */
export function resolvePlaceSearchAnchor(input: {
  readonly anchorLat?: number | null;
  readonly anchorLng?: number | null;
  readonly contextEventId?: string | null;
  readonly query?: string | null;
  readonly contextLabelKo?: string | null;
}): PlaceSearchAnchor | null {
  const fromInput = finitePair(input.anchorLat, input.anchorLng);
  if (fromInput) {
    return { ...fromInput, via: "input" };
  }

  const ctx = input.contextEventId?.trim();
  if (ctx) {
    const event = findLifeEventCandidate(ctx);
    if (event) {
      const meta = event.metadata ?? {};
      const metaLat =
        typeof meta.globePlaceLat === "number"
          ? meta.globePlaceLat
          : typeof meta.globePlaceCardLat === "number"
            ? meta.globePlaceCardLat
            : null;
      const metaLng =
        typeof meta.globePlaceLng === "number"
          ? meta.globePlaceLng
          : typeof meta.globePlaceCardLng === "number"
            ? meta.globePlaceCardLng
            : null;
      const fromMeta = finitePair(metaLat, metaLng);
      if (fromMeta) {
        return { ...fromMeta, via: "event_meta" };
      }

      const destLabel =
        (typeof meta.globePlaceLabel === "string" && meta.globePlaceLabel) ||
        (typeof meta.travelDestination === "string" &&
          meta.travelDestination) ||
        (typeof meta.globePlaceCardLabel === "string" &&
          meta.globePlaceCardLabel) ||
        event.place?.trim() ||
        event.title.trim() ||
        "";
      const fromDest = anchorFromLabel(destLabel);
      if (fromDest) {
        return { ...fromDest, via: "destination_label" };
      }
    }
  }

  const fromLabel = anchorFromLabel(
    `${input.contextLabelKo ?? ""} ${input.query ?? ""}`,
  );
  if (fromLabel) {
    return { ...fromLabel, via: "query_geo" };
  }

  return null;
}
