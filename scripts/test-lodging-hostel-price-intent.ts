#!/usr/bin/env npx tsx
/**
 * Guesthouse + nightly price cap must reshape lodging intent (not Hilton dump).
 */
import assert from "node:assert/strict";
import {
  filterLodgingRowsForIntent,
  parseMaxNightlyPriceKrw,
} from "../lib/globe/context-condition-ai/filter-lodging-for-intent";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import type { ContextLodgingInventoryRow } from "../lib/globe/context-hub/lodging-resource-types";

assert.equal(parseMaxNightlyPriceKrw("하루 3만원 미만으로 찾아줘"), 30_000);
assert.equal(parseMaxNightlyPriceKrw("3만 이하"), 30_000);
assert.equal(parseMaxNightlyPriceKrw("25000원 미만"), 25_000);

const hostel = resolveLocalDiscoveryAction({
  message: "게스트하우스 찾아줘",
});
assert.equal(hostel.status, "ready");
if (hostel.status === "ready") {
  assert.equal(hostel.spec.lodgingKind, "hostel");
  assert.equal(hostel.spec.budget, "low");
}

const capped = resolveLocalDiscoveryAction({
  message: "게스트하우스 하루 3만원 미만으로 찾아줘",
});
assert.equal(capped.status, "ready");
if (capped.status === "ready") {
  assert.equal(capped.spec.lodgingKind, "hostel");
  assert.equal(capped.spec.maxNightlyPriceKrw, 30_000);
  assert.equal(capped.spec.budget, "low");
}

const rows: ContextLodgingInventoryRow[] = [
  {
    placeId: "hilton",
    name: "Hilton Tokyo Hotel",
    lat: 35.69,
    lng: 139.69,
    priceKrw: 350_000,
    images: [],
  },
  {
    placeId: "gh1",
    name: "신주쿠 게스트하우스",
    lat: 35.69,
    lng: 139.7,
    priceKrw: 28_000,
    images: [],
  },
  {
    placeId: "gh2",
    name: "Tokyo Backpackers Hostel",
    lat: 35.7,
    lng: 139.7,
    priceKrw: 22_000,
    images: [],
  },
  {
    placeId: "mid",
    name: "Business Inn Kanda",
    lat: 35.69,
    lng: 139.77,
    priceKrw: 90_000,
    images: [],
  },
];

const filtered = filterLodgingRowsForIntent({
  rows,
  lodgingKind: "hostel",
  budget: "low",
  maxNightlyPriceKrw: 30_000,
});
assert.ok(filtered.every((row) => (row.priceKrw ?? 0) <= 30_000));
assert.ok(filtered.every((row) => !/hilton/i.test(row.name)));
assert.ok(filtered.some((row) => /게스트|hostel/i.test(row.name)));

console.log("ok: lodging-hostel-price-intent");
