#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  clearContextBloom,
  decideSegmentation,
  projectContextBloomArcs,
  rankContextBloomRelations,
  readContextBloomSession,
  startContextBloom,
  visualLayerRuleForType,
  selectProjectionVisual,
  isContextBloomExecutionReady,
  shouldShowContextBloomExecutionStrip,
  resolveContextEventIdFromResourceId,
  capabilitiesForBloomCandidate,
  gateBloomExecutionHandlers,
  runContextBloomAddToInbox,
} from "../lib/visual-projection";
import type { ContextBloomCandidate } from "../lib/visual-projection";

const castle: ContextBloomCandidate = {
  id: "m:castle",
  resourceId: "ctx:activity:castle",
  label: "Osaka Castle",
  lat: 34.6873,
  lng: 135.5262,
  pinKind: "activity",
};

const ramen: ContextBloomCandidate = {
  id: "m:ramen",
  resourceId: "ctx-osaka:eatery:ramen",
  label: "Ichiran",
  lat: 34.6687,
  lng: 135.5013,
  pinKind: "eatery",
};

const hotel: ContextBloomCandidate = {
  id: "m:hotel",
  resourceId: "ctx-osaka:lodging:hilton",
  label: "Hilton",
  lat: 34.6795,
  lng: 135.495,
  pinKind: "lodging",
};

const farShopping: ContextBloomCandidate = {
  id: "m:far",
  resourceId: "ctx:amenity:far",
  label: "Far Mall",
  lat: 35.0,
  lng: 136.0,
  pinKind: "amenity",
};

const ranked = rankContextBloomRelations({
  selected: castle,
  candidates: [castle, ramen, hotel, farShopping],
  maxRelated: 4,
});
assert.ok(ranked.length >= 2);
assert.ok(ranked.length <= 4);
assert.ok(ranked.every((row) => row.score >= 0.42));
assert.equal(ranked[0]!.bloomDelayMs, 100);
assert.ok(ranked.every((row) => row.id !== castle.id));
assert.ok(!ranked.some((row) => row.id === farShopping.id));

const arcs = projectContextBloomArcs({ selected: castle, related: ranked });
assert.equal(arcs.length, ranked.length);
assert.ok(arcs.every((arc) => arc.id.startsWith("bloom:")));

clearContextBloom();
const session = startContextBloom({
  selected: castle,
  candidates: [castle, ramen, hotel],
  nowMs: 1_000,
});
assert.ok(session.related.length >= 1);
assert.ok(session.arcs.length === session.related.length);
assert.equal(readContextBloomSession()?.selected.id, "m:castle");
assert.ok((readContextBloomSession()?.arcsUntilMs ?? 0) > 1_000);
// Node (no window timers) jumps to execution_ready for strip gating.
assert.equal(session.phase, "execution_ready");
assert.equal(isContextBloomExecutionReady(), true);
assert.equal(shouldShowContextBloomExecutionStrip(), true);
clearContextBloom();
assert.equal(readContextBloomSession(), null);
assert.equal(isContextBloomExecutionReady(), false);
assert.equal(shouldShowContextBloomExecutionStrip(), false);

// Visual layer rules
assert.equal(visualLayerRuleForType("restaurant").preferredSubject, "food");
assert.equal(visualLayerRuleForType("hotel").preferredSubject, "room");
assert.equal(visualLayerRuleForType("landmark").preferredSubject, "landmark_full");

// Selective segmentation — food YES, nightscape NO
const foodGate = decideSegmentation({
  objectType: "restaurant",
  imageUrl: "https://cdn.example.com/ramen-food-bowl.jpg",
  recognitionScore: 96,
});
assert.equal(foodGate.useSegmentation, true);

const nightGate = decideSegmentation({
  objectType: "landmark",
  imageUrl: "https://cdn.example.com/osaka-night-cityscape.jpg",
  caption: "야경",
  recognitionScore: 95,
});
assert.equal(nightGate.useSegmentation, false);
assert.ok(nightGate.segmentationScore < 50);

const beachGate = decideSegmentation({
  objectType: "activity",
  imageUrl: "https://cdn.example.com/beach-scenery.jpg",
  recognitionScore: 95,
});
assert.equal(beachGate.useSegmentation, false);

const pick = selectProjectionVisual({
  objectType: "restaurant",
  candidates: [
    { url: "https://cdn.example.com/storefront-sign.jpg" },
    { url: "https://cdn.example.com/ramen-food-dish.jpg" },
  ],
});
assert.ok(pick);
assert.match(pick!.url, /food/);
assert.equal(typeof pick!.useSegmentation, "boolean");

// Bloom → Execution helpers
assert.equal(
  resolveContextEventIdFromResourceId("ctx-osaka:lodging:hilton"),
  "ctx-osaka",
);
assert.equal(
  resolveContextEventIdFromResourceId("ctx-osaka:eatery:ramen"),
  "ctx-osaka",
);
const lodgingCaps = capabilitiesForBloomCandidate(hotel);
assert.ok(lodgingCaps.includes("book_room"));
assert.ok(lodgingCaps.includes("add_to_inbox"));
const gated = gateBloomExecutionHandlers({
  candidate: hotel,
  handlers: {
    onDirections: () => undefined,
    onReservePrep: () => undefined,
    onAddToExecutionInbox: () => undefined,
  },
});
assert.equal(typeof gated.onDirections, "function");
assert.equal(typeof gated.onReservePrep, "function");
assert.equal(typeof gated.onAddToExecutionInbox, "function");

clearContextBloom();
assert.equal(runContextBloomAddToInbox({ candidate: hotel }).ok, false); // not_ready
startContextBloom({
  selected: hotel,
  candidates: [hotel, ramen],
  nowMs: 2_000,
});
const inbox = runContextBloomAddToInbox({ candidate: hotel });
assert.equal(inbox.ok, true);
if (inbox.ok) {
  assert.equal(inbox.eventId, "ctx-osaka");
  assert.ok(inbox.operation.operationId);
}
clearContextBloom();

console.log("test-context-bloom: ok");
