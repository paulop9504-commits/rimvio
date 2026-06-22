import { findEventCandidate } from "@/lib/events/event-store";
import { listPersonalGlobePins } from "@/lib/globe/personal-globe-pin-store";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

export type PulseMemoryCandidate = {
  eventId: string;
  placeLabel: string;
  lat: number;
  lng: number;
  captureAtIso: string | null;
  distanceKm: number;
};

function readCaptureAtIso(eventId: string): string | null {
  const event = findEventCandidate(eventId);
  if (!event) {
    return null;
  }
  const meta = event.metadata ?? {};
  const captures = meta.feedCaptures;
  if (Array.isArray(captures) && captures.length > 0) {
    const last = captures[captures.length - 1] as { capturedAtIso?: string };
    if (last?.capturedAtIso?.trim()) {
      return last.capturedAtIso.trim();
    }
  }
  return event.datetime?.trim() ?? null;
}

/** Nearest personal Memory pin to anchor — Pulse MAIN requires personal SSOT first. */
export function pickPulseMemoryCandidate(input: {
  anchorLat: number;
  anchorLng: number;
  radiusKm?: number;
}): PulseMemoryCandidate | null {
  const radiusKm = input.radiusKm ?? 12;
  let best: PulseMemoryCandidate | null = null;

  for (const pin of listPersonalGlobePins()) {
    if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) {
      continue;
    }
    const distanceKm = haversineKm(
      input.anchorLat,
      input.anchorLng,
      pin.lat,
      pin.lng,
    );
    if (distanceKm > radiusKm) {
      continue;
    }
    const placeLabel = pin.placeLabel?.trim();
    if (!placeLabel) {
      continue;
    }
    if (!best || distanceKm < best.distanceKm) {
      best = {
        eventId: pin.eventId,
        placeLabel,
        lat: pin.lat,
        lng: pin.lng,
        captureAtIso: readCaptureAtIso(pin.eventId),
        distanceKm,
      };
    }
  }

  return best;
}
