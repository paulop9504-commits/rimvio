#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { FEED_CAPTURES_META_KEY } from "../lib/feed/feed-capture-types";
import {
  bridgeWeatherMatchesExperience,
  readBridgeWeatherFromEvent,
} from "../lib/globe/bridge-weather/bridge-weather-metadata";
import { resolveBridgeEventTime } from "../lib/globe/bridge-weather/resolve-bridge-event-time";
import { BRIDGE_WEATHER_META_KEY } from "../lib/globe/bridge-weather/bridge-weather-types";
import { resolveBridgeContextWeatherTarget } from "../lib/globe/resolve-bridge-context-weather-target";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-weather",
    title: "상하이 여행",
    category: "travel",
    source: "message",
    lifecycle: "completed",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: "2025-01-05T10:00:00.000Z",
    updatedAt: "2025-01-05T10:00:00.000Z",
    place: "상하이",
    datetime: "2025-01-02T10:00:00.000Z",
    ...overrides,
  };
}

const photoBridge = baseEvent({
  metadata: {
    [FEED_CAPTURES_META_KEY]: [
      {
        id: "cap-1",
        kind: "photo",
        capturedAtIso: "2025-01-01T14:30:00.000Z",
        verified: true,
      },
    ],
  },
});

const photoTime = resolveBridgeEventTime(photoBridge);
assert.equal(photoTime?.source, "photo_exif");
assert.equal(photoTime?.eventDate, "2025-01-01");
assert.equal(photoTime?.eventAtIso, "2025-01-01T14:30:00.000Z");

const eventStartBridge = baseEvent({
  datetime: "2025-01-02T10:00:00.000Z",
  createdAt: "2025-01-05T10:00:00.000Z",
  metadata: {},
});

const eventStartTime = resolveBridgeEventTime(eventStartBridge);
assert.equal(eventStartTime?.source, "event_start");
assert.equal(eventStartTime?.eventDate, "2025-01-02");

const createdOnlyBridge = baseEvent({
  datetime: undefined,
  createdAt: "2025-01-05T10:00:00.000Z",
  metadata: { planWindowEndIso: "2025-01-07T10:00:00.000Z" },
});

const createdTime = resolveBridgeEventTime(createdOnlyBridge);
assert.equal(createdTime?.source, "check_in_out");

const target = resolveBridgeContextWeatherTarget(photoBridge);
assert.ok(target);
assert.equal(target?.targetIso, "2025-01-01T14:30:00.000Z");
assert.notEqual(target?.targetIso, photoBridge.createdAt);

const stamped = baseEvent({
  metadata: {
    [BRIDGE_WEATHER_META_KEY]: {
      eventDate: "2025-01-01",
      location: "상하이",
      condition: "흐림",
      temperature: 6,
      high: 9,
      low: 3,
      source: "historical_weather",
      eventTimeSource: "photo_exif",
      resolvedAtIso: "2026-06-10T00:00:00.000Z",
    },
  },
});

const weather = readBridgeWeatherFromEvent(stamped);
assert.ok(weather);
assert.equal(weather?.temperature, 6);
assert.ok(
  bridgeWeatherMatchesExperience({
    stored: weather!,
    eventDate: "2025-01-01",
    location: "상하이",
  }),
);

console.log("test-bridge-event-weather: ok");
