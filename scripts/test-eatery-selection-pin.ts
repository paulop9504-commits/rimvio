#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { readPinnedContextItem } from "../lib/globe/context-pinned-item";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
} from "../lib/globe/eatery/eatery-resource-types";
import {
  pinEaterySelectionToContext,
  readPinnedEateryResourceId,
} from "../lib/globe/eatery/pin-eatery-selection-to-context";
import { findLifeEventCandidate } from "../lib/life-read-model";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);

const stamp = new Date().toISOString();
const event = commitEventUpsert({
  id: "test-eatery-pin-selection",
  title: "오사카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "candidate",
  datetime: stamp,
  place: "오사카",
  confidence: 0.92,
  metadata: {
    [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_EATERY_INVENTORY_META_KEY]: [
      {
        placeId: "eatery-namba-1",
        name: "난바 로컬 식당",
        lat: 34.667,
        lng: 135.501,
        images: ["https://example.com/namba.jpg"],
        address: "Namba, Osaka",
        provider: "google_places",
        providerLabel: "Google Places",
        virtualCandidate: true,
      },
    ],
  },
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
});

const row = (event.metadata?.[CONTEXT_EATERY_INVENTORY_META_KEY] as Array<{
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  images: string[];
  address: string;
  provider: "google_places";
  providerLabel: string;
  virtualCandidate: true;
}>)[0]!;

const updated = pinEaterySelectionToContext({
  eventId: event.id,
  row,
  previewUrl: row.images[0],
});

assert.equal(
  readPinnedEateryResourceId(updated),
  `${event.id}:eatery:${row.placeId}`,
);
assert.equal(
  updated.metadata?.[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY],
  row.placeId,
);
assert.equal(
  findLifeEventCandidate(event.id)?.metadata?.contextEateryPinnedName,
  row.name,
);
assert.deepEqual(readPinnedContextItem(updated), {
  version: 1,
  kind: "eatery",
  resourceId: `${event.id}:eatery:${row.placeId}`,
  placeId: row.placeId,
  label: row.name,
  pinnedAtIso: updated.metadata?.contextEateryPinnedAt as string,
  lat: row.lat,
  lng: row.lng,
  mapsUrl: undefined,
  previewUrl: row.images[0],
});

console.log("test-eatery-selection-pin: ok");
