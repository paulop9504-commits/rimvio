#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildHubCarouselSlides } from "../lib/globe/context-hub/build-hub-carousel-slides";
import { rankContextHubServices } from "../lib/globe/context-hub/rank-context-hub-services";
import type { ContextHubServiceRow } from "../lib/globe/context-hub/context-hub-service-catalog";
import { resolvePrimaryHubServiceRow } from "../lib/globe/context-hub/resolve-primary-hub-service";
import {
  resolveActiveGlobeContext,
  resolveRankedActiveGlobeContexts,
} from "../lib/globe/resolve-active-globe-context";

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
  row({
    serviceId: "ticket",
    connected: true,
    handoffHref: "blob:qr-preview",
    handoffLabelKo: "QR 보기",
    link: {
      eventId: "h1",
      kind: "departure_airport",
      label: "티켓",
      shortLabel: "QR",
      actionUrl: "https://ticket.example.com",
      actionLabelKo: "티켓",
    },
  }),
]);
assert.equal(ranked[0]?.serviceId, "ticket");
assert.equal(resolvePrimaryHubServiceRow(ranked)?.serviceId, "ticket");

const slides = buildHubCarouselSlides({
  resources: ranked,
  alternates: [
    { eventId: "ec-later", title: "콘서트", place: "올림픽공원" },
  ],
  activeEventId: "ec-park",
});
assert.equal(slides.length, 4);
assert.equal(slides[0]?.kind, "resource");
assert.equal(slides[3]?.kind, "context");
assert.equal(
  slides[3]?.kind === "context" ? slides[3].alternate.eventId : null,
  "ec-later",
);

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

const rankedContexts = resolveRankedActiveGlobeContexts({
  events,
  now,
  lat: 36.35,
  lng: 127.38,
});
assert.ok(rankedContexts.length >= 1);
assert.equal(rankedContexts[0]?.eventId, "ec-park");

console.log("test-globe-hub-carousel: ok");
