import assert from "node:assert/strict";
import {
  isMarketplaceBridgeType,
  readBridgeTypeFromMetadata,
} from "../lib/bridge/bridge-type";
import { projectMarketplaceBridgeFromIntent } from "../lib/bridge/marketplace-bridge-schema";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";

const record: MarketIntentRecord = {
  id: "m1",
  eventId: "evt-1",
  role: "listing",
  categoryId: "market.phone",
  title: "아이폰 15 Pro",
  priceMinKrw: 800_000,
  priceMaxKrw: 800_000,
  radiusKm: 5,
  anchorLat: 36.35,
  anchorLng: 127.38,
  placeLabel: "대전 유성구",
  peakHour: null,
  confirmedAtIso: "2026-06-23T10:00:00+09:00",
  active: true,
  detail: {
    ...DEFAULT_MARKET_INTENT_DETAIL,
    productName: "아이폰 15 Pro",
    conditionId: "good",
    prioritySlots: { battery: "85%" },
  },
};

const bridge = projectMarketplaceBridgeFromIntent(record);
assert.equal(bridge.bridgeType, "marketplace");
assert.equal(bridge.intent, "sell");
assert.equal(bridge.productName, "아이폰 15 Pro");
assert.equal(bridge.region, "대전 유성구");

assert.equal(
  readBridgeTypeFromMetadata({ bridgeType: "marketplace" }),
  "marketplace",
);
assert.equal(readBridgeTypeFromMetadata({ marketIntent: {} }), "marketplace");
assert.equal(isMarketplaceBridgeType("marketplace"), true);
assert.equal(isMarketplaceBridgeType("travel"), false);

console.log("test-bridge-type: ok");
