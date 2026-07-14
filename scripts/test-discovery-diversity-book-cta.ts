#!/usr/bin/env npx tsx
/**
 * Diversity rerank — avoid Hilton walls; lodging book handoff is hotels search.
 */

import assert from "node:assert/strict";
import {
  diversifyScoredRecommendations,
  lodgingChainScorePenalty,
} from "../lib/globe/discovery-policy/diversify-scored-recommendations";
import { buildContextLodgingBookingHandoff } from "../lib/globe/context-action-injection/build-context-action-handoff";

const rows = [
  { score: 100, row: { name: "Hilton Tokyo", lat: 35.69, lng: 139.69 } },
  { score: 99, row: { name: "Hilton Tokyo Bay", lat: 35.69, lng: 139.7 } },
  { score: 90, row: { name: "Quiet Local Stay Shinjuku", lat: 35.7, lng: 139.7 } },
  { score: 88, row: { name: "Marriott Tokyo", lat: 35.68, lng: 139.76 } },
  { score: 85, row: { name: "Koenji Guest House", lat: 35.7, lng: 139.65 } },
];

const diversified = diversifyScoredRecommendations(rows, {
  originLat: 35.69,
  originLng: 139.7,
  lambda: 0.55,
});

assert.equal(diversified[0]?.row.name.includes("Hilton"), true);
assert.ok(
  diversified.slice(0, 3).some((row) => !/hilton/i.test(row.row.name)),
  "top-3 should not be all Hilton after diversity",
);
assert.ok(lodgingChainScorePenalty("Hilton Tokyo") > 0);
assert.equal(lodgingChainScorePenalty("Koenji Guest House"), 0);

const handoff = buildContextLodgingBookingHandoff({
  row: {
    name: "Hilton Tokyo Hotel",
    lat: 35.69,
    lng: 139.69,
    mapsUrl: "https://maps.google.com/example",
    priceKrw: 1_952_772,
    checkInIso: "2026-08-01",
    checkOutIso: "2026-08-03",
  },
  intent: { kind: "book_lodging", resourceKind: "lodging", confidence: 1 },
  lodgingKind: "hotel",
});
assert.match(handoff.href, /travel\/hotels/);
assert.ok(handoff.href.includes(encodeURIComponent("Hilton Tokyo Hotel")));
assert.ok(!handoff.href.includes("maps.google.com"));

console.log("✓ discovery diversity + lodging book handoff");
