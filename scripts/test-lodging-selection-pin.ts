#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  readPinnedContextItem,
  CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY,
} from "../lib/globe/context-pinned-item";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "../lib/globe/context-hub/lodging-resource-types";
import {
  pinLodgingSelectionToContext,
  readPinnedLodgingResourceId,
} from "../lib/globe/context-hub/pin-lodging-selection-to-context";
import { findLifeEventCandidate } from "../lib/life-read-model";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);

const stamp = new Date().toISOString();
const event = commitEventUpsert({
  id: "test-lodging-pin-selection",
  title: "후쿠오카 출장",
  category: "travel",
  source: "manual",
  lifecycle: "candidate",
  datetime: stamp,
  place: "후쿠오카",
  confidence: 0.91,
  metadata: {
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [
      {
        placeId: "stay-hakata-1",
        name: "하카타 비즈 스테이",
        lat: 33.589,
        lng: 130.42,
        images: ["https://example.com/hakata.jpg"],
        priceKrw: 169000,
        partnerLabel: "Booking",
        address: "Hakata, Fukuoka",
        mapsUrl: "https://maps.example.com/hakata",
        provider: "google_places",
        photoSource: "google_places_details",
        photoConfidence: "exact_place_id",
        checkInIso: "2026-07-10T15:00:00.000Z",
        checkOutIso: "2026-07-12T11:00:00.000Z",
      },
    ],
  },
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
});

const row = (event.metadata?.[CONTEXT_LODGING_INVENTORY_META_KEY] as Array<{
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  images: string[];
  priceKrw: number;
  partnerLabel: string;
  address: string;
  mapsUrl: string;
  provider: "google_places";
  photoSource: "google_places_details";
  photoConfidence: "exact_place_id";
  checkInIso: string;
  checkOutIso: string;
}>)[0]!;

const updated = pinLodgingSelectionToContext({
  eventId: event.id,
  row,
  previewUrl: row.images[0],
});

assert.equal(
  readPinnedLodgingResourceId(updated),
  `${event.id}:lodging:${row.placeId}`,
);
assert.equal(
  updated.metadata?.[CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY],
  row.placeId,
);
assert.equal(
  findLifeEventCandidate(event.id)?.metadata?.contextLodgingPinnedName,
  row.name,
);
assert.deepEqual(readPinnedContextItem(updated), {
  version: 1,
  kind: "lodging",
  resourceId: `${event.id}:lodging:${row.placeId}`,
  placeId: row.placeId,
  label: row.name,
  pinnedAtIso: updated.metadata?.contextLodgingPinnedAt as string,
  lat: row.lat,
  lng: row.lng,
  mapsUrl: row.mapsUrl,
  previewUrl: row.images[0],
});

console.log("test-lodging-selection-pin: ok");
