#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { rankContextHubServices } from "../lib/globe/context-hub/rank-context-hub-services";
import type { ContextHubServiceRow } from "../lib/globe/context-hub/context-hub-service-catalog";
import { resolvePrimaryHubServiceRow } from "../lib/globe/context-hub/resolve-primary-hub-service";
import { resolveActiveGlobeContext } from "../lib/globe/resolve-active-globe-context";

function row(
  partial: Partial<ContextHubServiceRow> & Pick<ContextHubServiceRow, "serviceId">,
): ContextHubServiceRow {
  return {
    serviceId: partial.serviceId,
    labelKo: partial.labelKo ?? partial.serviceId,
    shortLabelKo: partial.shortLabelKo ?? partial.serviceId,
    implemented: partial.implemented ?? true,
    offered: partial.offered ?? true,
    connected: partial.connected ?? false,
    link: partial.link ?? null,
    flightOptions: partial.flightOptions ?? [],
    handoffHref: partial.handoffHref ?? null,
    handoffLabelKo: partial.handoffLabelKo ?? null,
  };
}

const ranked = rankContextHubServices([
  row({ serviceId: "ai_search", handoffHref: "/search", connected: true }),
  row({
    serviceId: "flight",
    connected: true,
    link: {
      eventId: "h1",
      kind: "departure_airport",
      label: "ICN",
      shortLabel: "ICN",
      airportIata: "ICN",
      actionUrl: "https://flight.naver.com",
      actionLabelKo: "항공",
    },
  }),
]);
assert.equal(ranked[0]?.serviceId, "flight");
assert.equal(resolvePrimaryHubServiceRow(ranked)?.serviceId, "flight");

const now = new Date("2026-06-15T10:00:00.000Z");
const events: EventCandidate[] = [
  {
    id: "ec-park",
    title: "놀이공원",
    category: "travel",
    source: "message",
    lifecycle: "scheduled",
    confidence: 0.9,
    lifecycleUpdatedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    datetime: "2026-06-15T09:00:00.000Z",
    place: "둔산동",
    metadata: { feedPlanEnabled: true, globeManualContext: true },
  },
  {
    id: "ec-later",
    title: "콘서트",
    category: "concert",
    source: "message",
    lifecycle: "scheduled",
    confidence: 0.9,
    lifecycleUpdatedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    datetime: "2026-06-20T18:00:00.000Z",
    place: "올림픽공원",
    metadata: { feedPlanEnabled: true, globeManualContext: true },
  },
];

const match = resolveActiveGlobeContext({
  events,
  now,
  lat: 36.35,
  lng: 127.38,
});
assert.ok(match);
assert.equal(match.eventId, "ec-park");
assert.ok(match.tier === "high" || match.tier === "medium");

console.log("test-globe-hub-carousel: ok");
