import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate, upsertEventCandidate } from "@/lib/events/event-store";
import type { BridgeWeatherRecord } from "@/lib/globe/bridge-weather/bridge-weather-types";
import { BRIDGE_WEATHER_META_KEY } from "@/lib/globe/bridge-weather/bridge-weather-types";

function isBridgeWeatherRecord(value: unknown): value is BridgeWeatherRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as BridgeWeatherRecord;
  return (
    typeof row.eventDate === "string" &&
    typeof row.location === "string" &&
    typeof row.condition === "string" &&
    typeof row.temperature === "number" &&
    typeof row.high === "number" &&
    typeof row.low === "number" &&
    typeof row.source === "string"
  );
}

export function readBridgeWeatherFromEvent(
  event: EventCandidate | null | undefined,
): BridgeWeatherRecord | null {
  const raw = event?.metadata?.[BRIDGE_WEATHER_META_KEY];
  return isBridgeWeatherRecord(raw) ? raw : null;
}

export function bridgeWeatherMatchesExperience(input: {
  stored: BridgeWeatherRecord;
  eventDate: string;
  location: string;
}): boolean {
  return (
    input.stored.eventDate === input.eventDate &&
    input.stored.location.trim().toLowerCase() === input.location.trim().toLowerCase()
  );
}

/** Persist experience-time weather on the bridge — not upload-time forecast. */
export function stampBridgeWeatherOnEvent(input: {
  eventId: string;
  weather: BridgeWeatherRecord;
}): EventCandidate | null {
  const eventId = input.eventId.trim();
  if (!eventId) {
    return null;
  }

  const existing = findEventCandidate(eventId);
  if (!existing) {
    return null;
  }

  return upsertEventCandidate({
    id: eventId,
    title: existing.title,
    category: existing.category,
    source: existing.source,
    lifecycle: existing.lifecycle,
    confidence: existing.confidence,
    metadata: {
      ...(existing.metadata ?? {}),
      [BRIDGE_WEATHER_META_KEY]: input.weather,
    },
  });
}
