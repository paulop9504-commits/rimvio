#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  applyBloomRelationsToObject,
  buildRealityObject,
  hydrateBloomRelatedFromEdges,
  persistContextBloomRelationsOnEvent,
  readPersistedBloomRelated,
  readPrimaryRealityObject,
  resolveBloomRelatedForSelect,
} from "../lib/reality-object";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  clearContextBloom,
  startContextBloom,
} from "../lib/visual-projection";
import type { ContextBloomCandidate } from "../lib/visual-projection";

resetEventCandidatesForTests();

const castle: ContextBloomCandidate = {
  id: "m:castle",
  resourceId: "ctx-osaka:activity:castle",
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

const related = resolveBloomRelatedForSelect({
  selected: castle,
  candidates: [castle, ramen, hotel],
});
assert.ok(related.length >= 2);

const object = buildRealityObject({
  contextEventId: "ctx-osaka",
  title: castle.label,
  placeId: "place-castle",
  resourceId: castle.resourceId,
  pinKind: "activity",
  lat: castle.lat,
  lng: castle.lng,
});
const withEdges = applyBloomRelationsToObject({
  object,
  related,
  nowIso: "2026-07-18T00:00:00.000Z",
});
assert.equal(withEdges.relations.relatedObjectIds.length, related.length);
assert.equal(withEdges.relations.edges?.length, related.length);
assert.equal(withEdges.relations.bloomRankedAtIso, "2026-07-18T00:00:00.000Z");

const hydrated = hydrateBloomRelatedFromEdges({
  edges: withEdges.relations.edges ?? [],
  candidates: [castle, ramen, hotel],
});
assert.ok(hydrated.length >= 2);
assert.ok(hydrated.every((row) => row.id !== castle.id));

// Prefer persisted when >= 2 matches
const preferred = resolveBloomRelatedForSelect({
  selected: castle,
  candidates: [castle, ramen, hotel],
  preferredRelated: hydrated,
});
assert.equal(preferred[0]!.resourceId, hydrated[0]!.resourceId);

const event = commitEventUpsert({
  id: "ctx-osaka",
  title: "오사카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: null,
  place: null,
  description: null,
  containerId: null,
  confidence: 1,
  metadata: {},
});

const persisted = persistContextBloomRelationsOnEvent({
  contextEventId: "ctx-osaka",
  selected: castle,
  related,
  event,
});
assert.ok(persisted);
const primary = readPrimaryRealityObject(persisted);
assert.ok(primary);
assert.ok((primary!.relations.edges?.length ?? 0) >= 2);

const fromStore = readPersistedBloomRelated({
  event: persisted,
  selected: castle,
  candidates: [castle, ramen, hotel],
});
assert.ok(fromStore.length >= 2);

clearContextBloom();
const session = startContextBloom({
  selected: castle,
  candidates: [castle, ramen, hotel],
  preferredRelated: fromStore,
  nowMs: 3_000,
});
assert.equal(session.related[0]!.resourceId, fromStore[0]!.resourceId);
clearContextBloom();

console.log("test-bloom-relations-persist: ok");
