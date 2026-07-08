import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "../lib/globe/context-hub/lodging-resource-types";
import { pinLodgingSelectionToContext } from "../lib/globe/context-hub/pin-lodging-selection-to-context";
import {
  CONTEXT_COMMITTED_RESOURCES_META_KEY,
  readCommittedContextResources,
} from "../lib/globe/resource/emit-committed-context-resource";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);

const stamp = new Date().toISOString();
const event = commitEventUpsert({
  id: "test-committed-resource",
  title: "오사카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: stamp,
  place: "오사카",
  confidence: 0.9,
  metadata: {
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [
      {
        placeId: "stay-1",
        name: "오사카 호텔",
        lat: 34.67,
        lng: 135.5,
        images: [],
        priceKrw: 110000,
        checkInIso: "2026-08-01T15:00:00.000Z",
        checkOutIso: "2026-08-03T11:00:00.000Z",
      },
    ],
  },
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
});

assert.equal(readCommittedContextResources(event).length, 0);

const row = (
  event.metadata?.[CONTEXT_LODGING_INVENTORY_META_KEY] as Array<{
    placeId: string;
    name: string;
    lat: number;
    lng: number;
    images: string[];
    priceKrw: number;
    checkInIso: string;
    checkOutIso: string;
  }>
)[0]!;

const pinned = pinLodgingSelectionToContext({
  eventId: event.id,
  row,
});

const committed = readCommittedContextResources(pinned);
assert.equal(committed.length, 1);
assert.equal(committed[0]?.resourceId, `${event.id}:lodging:stay-1`);
assert.equal(committed[0]?.kind, "lodging_voucher");
assert.equal(committed[0]?.label, "오사카 호텔");
assert.ok(Array.isArray(pinned.metadata?.[CONTEXT_COMMITTED_RESOURCES_META_KEY]));

// Re-pin same place → upsert, not duplicate
const again = pinLodgingSelectionToContext({
  eventId: event.id,
  row: { ...row, name: "오사카 호텔 (갱신)" },
});
assert.equal(readCommittedContextResources(again).length, 1);
assert.equal(readCommittedContextResources(again)[0]?.label, "오사카 호텔 (갱신)");

console.log("test-committed-context-resource: ok");
