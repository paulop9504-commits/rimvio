import assert from "node:assert/strict";
import {
  classifyContextConditionAnchorRequest,
  filterLodgingRowsForContextCondition,
  filterLodgingRowsSimilarToAnchor,
  dismissContextConditionPinBatch,
  listContextConditionPins,
  syncContextConditionPins,
  readContextConditionPinBatches,
} from "../lib/globe/context-condition-ai";
import { resolveLodgingMockForPlace } from "../lib/globe/context-hub/lodging-mock-inventory";
import { mergeLodgingInventoryRows } from "../lib/globe/context-condition-ai/merge-context-hub-inventory-rows";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import type { EventCandidate } from "../lib/events/event-candidate";

function testClassifyIntent() {
  assert.deepEqual(classifyContextConditionAnchorRequest(null), {
    lodgingSimilar: true,
    eateryNearby: true,
    lodgingMode: "nearby",
  });
  assert.deepEqual(classifyContextConditionAnchorRequest("비슷한 가격 숙소"), {
    lodgingSimilar: true,
    eateryNearby: false,
    lodgingMode: "similar_price",
  });
  assert.deepEqual(classifyContextConditionAnchorRequest("주변 맛집"), {
    lodgingSimilar: false,
    eateryNearby: true,
    lodgingMode: null,
  });
  assert.deepEqual(classifyContextConditionAnchorRequest("주변 호텔좀 찾아줘"), {
    lodgingSimilar: true,
    eateryNearby: false,
    lodgingMode: "nearby",
  });
  assert.deepEqual(classifyContextConditionAnchorRequest("음료"), {
    lodgingSimilar: false,
    eateryNearby: true,
    lodgingMode: null,
  });
  assert.deepEqual(classifyContextConditionAnchorRequest("음료수"), {
    lodgingSimilar: false,
    eateryNearby: true,
    lodgingMode: null,
  });
  assert.deepEqual(classifyContextConditionAnchorRequest("커피"), {
    lodgingSimilar: false,
    eateryNearby: true,
    lodgingMode: null,
  });
}

function testFilterLodgingNearby() {
  const rows = [
    { placeId: "anchor", priceKrw: 100_000 },
    { placeId: "a", priceKrw: 200_000 },
    { placeId: "b", priceKrw: 95_000 },
    { placeId: "c", priceKrw: 110_000 },
    { placeId: "d", priceKrw: 50_000 },
  ];
  const filtered = filterLodgingRowsForContextCondition({
    rows,
    anchorPlaceId: "anchor",
    anchorPriceKrw: 100_000,
    lodgingMode: "nearby",
    max: 3,
  });
  assert.equal(filtered.length, 3);
  assert.ok(filtered.every((row) => row.placeId !== "anchor"));
  assert.ok(filtered.some((row) => row.placeId === "a"));
}

function testFilterLodgingPrice() {
  const rows = [
    { placeId: "anchor", priceKrw: 100_000 },
    { placeId: "a", priceKrw: 95_000 },
    { placeId: "b", priceKrw: 200_000 },
    { placeId: "c", priceKrw: 110_000 },
  ];
  const filtered = filterLodgingRowsSimilarToAnchor({
    rows,
    anchorPlaceId: "anchor",
    anchorPriceKrw: 100_000,
    max: 2,
  });
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every((row) => row.placeId !== "anchor"));
  assert.ok(filtered.some((row) => row.placeId === "a"));
  assert.ok(filtered.some((row) => row.placeId === "c"));
  assert.equal(filtered.some((row) => row.placeId === "b"), false);
}

function testSyncAndDismissBatch() {
  resetPersonalGlobePinsForTests();
  const event: EventCandidate = {
    id: "evt-test",
    title: "상하이",
    category: "travel",
    datetime: "2026-07-05T00:00:00.000Z",
    place: "상하이",
    metadata: {},
  };
  const batchId = "ctxcond-test";
  syncContextConditionPins({
    contextEvent: event,
    batchId,
    lodgingRows: [
      {
        placeId: "lodging-1",
        name: "호텔 A",
        images: [],
        lat: 31.2,
        lng: 121.4,
        priceKrw: 120_000,
      },
    ],
    eateryRows: [
      {
        placeId: "eatery-1",
        name: "식당 B",
        images: [],
        lat: 31.21,
        lng: 121.41,
      },
    ],
  });
  const pins = listContextConditionPins({ contextEventId: event.id, batchId });
  assert.equal(pins.length, 2);
  assert.ok(pins.every((pin) => pin.source === "context_condition_ai"));
  const removed = dismissContextConditionPinBatch({
    contextEventId: event.id,
    batchId,
  });
  assert.equal(removed, 2);
  assert.equal(
    listContextConditionPins({ contextEventId: event.id, batchId }).length,
    0,
  );
}

function testMergeInventoryRows() {
  const merged = mergeLodgingInventoryRows(
    [{ placeId: "a", priceKrw: 100_000, name: "A", images: [], lat: 1, lng: 2 }],
    [{ placeId: "b", priceKrw: 90_000, name: "B", images: [], lat: 3, lng: 4 }],
  );
  assert.equal(merged.length, 2);
}

function testJapanLodgingMock() {
  const rows = resolveLodgingMockForPlace("東京 여행", { lat: 35.6762, lng: 139.6503 });
  assert.equal(rows.length, 5);
  assert.ok(rows.some((row) => /新宿|渋谷|銀座/iu.test(row.name)));
}

function testBatchMetadataOnEvent() {
  const event: EventCandidate = {
    id: "evt-batch",
    title: "상하이",
    category: "travel",
    datetime: "2026-07-05T00:00:00.000Z",
    place: "상하이",
    metadata: {
      contextConditionPinBatches: [
        {
          batchId: "ctxcond-test",
          lodgingPlaceIds: ["lodging-1"],
          eateryPlaceIds: ["eatery-1"],
          atIso: "2026-07-05T00:00:00.000Z",
        },
      ],
    },
  };
  const batches = readContextConditionPinBatches(event);
  assert.equal(batches.length, 1);
  assert.equal(batches[0]?.batchId, "ctxcond-test");
}

testClassifyIntent();
testFilterLodgingNearby();
testFilterLodgingPrice();
testJapanLodgingMock();
testMergeInventoryRows();
testBatchMetadataOnEvent();
testSyncAndDismissBatch();
console.log("test-context-condition-anchor-pin: ok");
