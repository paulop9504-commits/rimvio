/**
 * Workspace approve → Hub checkout placeId / inventory ensure.
 * Run: npx tsx scripts/test-workspace-lodging-checkout-ensure.ts
 */
import assert from "node:assert/strict";
import {
  findLodgingInventoryRowByPlaceId,
  lodgingPlaceIdsMatch,
  normalizeLodgingPlaceIdKey,
} from "@/lib/context-workspace/ensure-lodging-inventory-for-checkout";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

assert.equal(normalizeLodgingPlaceIdKey("liteapi:abc123"), "abc123");
assert.equal(normalizeLodgingPlaceIdKey("maps:xyz"), "xyz");
assert.ok(lodgingPlaceIdsMatch("liteapi:abc", "abc"));
assert.ok(lodgingPlaceIdsMatch("abc", "liteapi:abc"));
assert.ok(!lodgingPlaceIdsMatch("abc", "def"));

const rows: ContextLodgingInventoryRow[] = [
  {
    placeId: "liteapi:hotel-1",
    name: "Test Hotel",
    images: [],
    lat: 34.66,
    lng: 135.5,
    priceKrw: 200000,
    liteapiHotelId: "hotel-1",
  },
];

assert.equal(
  findLodgingInventoryRowByPlaceId(rows, "hotel-1")?.placeId,
  "liteapi:hotel-1",
);
assert.equal(
  findLodgingInventoryRowByPlaceId(rows, "liteapi:hotel-1")?.name,
  "Test Hotel",
);

console.log("ok: workspace lodging checkout ensure");
