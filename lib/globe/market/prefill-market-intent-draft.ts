import { findEventCandidate } from "@/lib/events/event-store";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { isCoordPlaceLabel } from "@/lib/globe/market/format-market-place-label";
import { resolveKoreaPlaceFromCoords } from "@/lib/globe/korea-place-from-coords";
import { matchKoreaMetroDistrict } from "@/lib/globe/korea-metro-districts";
import { formatTrendHourBucketLabel } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";
import { normalizeCaptureTimeAnchor } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";
import { pickPulseMemoryCandidate } from "@/lib/globe/trend-bridge/pick-pulse-memory-candidate";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";

function readEventPlace(eventId: string): {
  placeLabel: string;
  lat: number | null;
  lng: number | null;
} {
  const event = findEventCandidate(eventId);
  if (!event) {
    return { placeLabel: "", lat: null, lng: null };
  }
  const pin = findPersonalGlobePinByEventId(eventId);
  const lat = pin?.lat ?? null;
  const lng = pin?.lng ?? null;
  return {
    placeLabel: pin?.placeLabel?.trim() || event.place?.trim() || "",
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

function memoryPeakHour(captureAtIso: string | null): string | null {
  if (!captureAtIso?.trim()) {
    return null;
  }
  const anchor = normalizeCaptureTimeAnchor({
    timestamp: captureAtIso,
    timeZone: "Asia/Seoul",
  });
  if (!anchor) {
    return null;
  }
  return formatTrendHourBucketLabel(anchor.hourStart);
}

/** Memory + GPS prefill — user confirms, does not author from scratch. */
export function prefillMarketIntentDraft(input: {
  draft: MarketIntentDraft;
  liveLat: number | null;
  liveLng: number | null;
}): MarketIntentDraft {
  const sources = [...input.draft.prefillSources];
  let anchorLat = input.draft.anchorLat;
  let anchorLng = input.draft.anchorLng;
  let placeLabel = input.draft.placeLabel;
  let peakHour = input.draft.peakHour;

  const eventPlace = readEventPlace(input.draft.eventId);
  if (eventPlace.placeLabel && !placeLabel) {
    placeLabel = eventPlace.placeLabel;
    sources.push("event_place");
  }
  if (
    eventPlace.lat !== null &&
    eventPlace.lng !== null &&
    (!anchorLat || !anchorLng)
  ) {
    anchorLat = eventPlace.lat;
    anchorLng = eventPlace.lng;
    sources.push("event_geo");
  }

  if (
    input.liveLat !== null &&
    input.liveLng !== null &&
    Number.isFinite(input.liveLat) &&
    Number.isFinite(input.liveLng)
  ) {
    anchorLat = input.liveLat;
    anchorLng = input.liveLng;
    sources.push("gps");
    if (!placeLabel || isCoordPlaceLabel(placeLabel)) {
      const resolved = resolveKoreaPlaceFromCoords(input.liveLat, input.liveLng);
      const metro = matchKoreaMetroDistrict(resolved.label);
      if (metro) {
        placeLabel = metro.label;
      } else if (!placeLabel || isCoordPlaceLabel(placeLabel)) {
        placeLabel = resolved.label;
      }
    }
  }

  const memory =
    anchorLat && anchorLng
      ? pickPulseMemoryCandidate({
          anchorLat,
          anchorLng,
          radiusKm: input.draft.radiusKm,
        })
      : null;

  if (memory) {
    if (!placeLabel) {
      placeLabel = memory.placeLabel;
    }
    if (!peakHour) {
      peakHour = memoryPeakHour(memory.captureAtIso);
    }
    if (peakHour) {
      sources.push("memory_hour");
    }
    sources.push("memory_place");
  }

  return {
    ...input.draft,
    anchorLat: anchorLat ?? 0,
    anchorLng: anchorLng ?? 0,
    placeLabel,
    peakHour,
    prefillSources: [...new Set(sources)],
  };
}
