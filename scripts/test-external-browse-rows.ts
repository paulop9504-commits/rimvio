#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { listExternalBrowseRows } from "../lib/globe/opportunity-field/list-external-browse-rows";
import { buildUserStateV1 } from "../lib/globe/opportunity-field/build-user-state";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";

const listing: MarketIntentRecord = {
  id: "lst-1",
  eventId: "ec-lst-1",
  role: "listing",
  categoryId: "market.phone",
  title: "아이폰",
  priceMinKrw: 500_000,
  priceMaxKrw: 550_000,
  radiusKm: 10,
  anchorLat: 37.5665,
  anchorLng: 126.978,
  placeLabel: "서울",
  peakHour: null,
  confirmedAtIso: new Date().toISOString(),
  active: true,
  detail: {
    ...DEFAULT_MARKET_INTENT_DETAIL,
    productName: "아이폰 15",
    publishedExternal: true,
  },
};

const rows = listExternalBrowseRows({
  pool: [listing],
  userState: buildUserStateV1({
    lat: 37.57,
    lng: 126.98,
    capturedAtIso: new Date().toISOString(),
    primaryEventId: null,
    now: new Date(),
  }),
  copy: {
    reasonBattery: "",
    reasonStorage: "",
    reasonPrice: "",
    reasonDistance: "근처",
    reasonRecency: "최근",
    reasonCondition: "",
    reasonFallback: "",
  },
});

assert.equal(rows.length, 1);
assert.equal(rows[0]?.title, "아이폰 15");

console.log("test-external-browse-rows: ok");
