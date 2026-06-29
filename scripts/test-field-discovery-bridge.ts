#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildContextGraph } from "../lib/dev/build-context-graph";
import { detectContextAlerts } from "../lib/dev/detect-context-alerts";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildFieldPlaceSearchQuery } from "../lib/globe/opportunity-field/build-field-place-search-query";
import { isFieldLodgingDiscoveryPill } from "../lib/globe/opportunity-field/build-field-lodging-discovery-enabled";
import { marketIntentGlobePinId } from "../lib/globe/opportunity-field/globe-field-discovery-bridge";
import { lodgingDiscoveryGlobePinId } from "../lib/globe/opportunity-field/project-lodging-discovery-pin-cluster";
import { placeDiscoveryGlobePinId } from "../lib/globe/opportunity-field/project-place-discovery-pin-cluster";
import { normalizeFieldPlaceSearchQuery } from "../lib/globe/opportunity-field/run-field-place-discovery-search";

const root = join(import.meta.dirname, "..");

assert.equal(marketIntentGlobePinId("abc"), "mkt:abc");
assert.equal(placeDiscoveryGlobePinId("p1"), "plc:p1");
assert.equal(buildFieldPlaceSearchQuery({ title: "아이폰 15" }), "아이폰 15 맛집");
assert.equal(buildFieldPlaceSearchQuery({ title: "강남 숙소" }), null);
assert.equal(isFieldLodgingDiscoveryPill({ title: "부산 숙소 구해요" }), true);
assert.equal(lodgingDiscoveryGlobePinId("h1"), "lod:h1");
assert.equal(normalizeFieldPlaceSearchQuery("강남 스테이크"), "강남 스테이크");
assert.ok(
  readFileSync(join(root, "hooks/use-field-place-discovery.ts"), "utf8").includes(
    "/api/globe/place-discovery",
  ),
  "Field hook must target production place-discovery API",
);

const event: EventCandidate = {
  id: "ec-1",
  title: "부산 여행",
  category: "travel",
  source: "chat",
  lifecycle: "mentioned",
  createdAt: "2026-06-01T00:00:00.000Z",
};

const graph = buildContextGraph({
  events: [event],
  peopleGraph: { people: [], contactCount: 0, discoveredCount: 0 },
  memories: [
    {
      id: "mem-1",
      topic: "부산",
      summary: "해운대 근처 숙소 찾기",
      keywords: ["부산", "여행"],
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  pinEventIds: new Set(),
  externalPinEventIds: new Set(),
});

assert.ok(
  graph.edges.some(
    (edge) => edge.from === "memory:mem-1" && edge.to === "event:ec-1",
  ),
  "memory should link to event via token overlap",
);

const alerts = detectContextAlerts({
  internal: {
    eventCount: 1,
    eventsByLifecycle: {},
    eventsByCategory: {},
    internalPinCount: 0,
    externalVisibilityEventCount: 1,
    peopleCount: 0,
    contactCount: 0,
    discoveredPeopleCount: 0,
    conversationMemoryCount: 0,
    saveTrajectoryCount: 0,
    dominantTrajectoryCluster: null,
  },
  external: {
    externalPinCount: 0,
    privatePinCount: 1,
    orphanExternalPins: [],
    orphanExternalEvents: [],
  },
  liveStream: [],
  events: [
    {
      ...event,
      metadata: { globeContextVisibility: "external" },
    },
  ],
  externalPinRows: [{ event_id: "ec-1", visibility: "private" }],
});

assert.ok(
  alerts.some((alert) => alert.kind === "scope_drift"),
  "scope drift when metadata external but pin private",
);

console.log("test-field-discovery-bridge: ok");
