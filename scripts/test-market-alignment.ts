#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import { normalizeMarketIntentFromText } from "../lib/globe/market/normalize-market-intent-from-text";
import { resolveMarketAlignment } from "../lib/globe/market/resolve-market-alignment";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";

const copy = {
  headlineSeeking: (t: string, p: string) => `seek ${t} ${p}`,
  headlineListing: (t: string, p: string) => `list ${t} ${p}`,
  body: (c: string, d: number, price: string) => `${c} ${d} ${price}`,
  cta: "Open",
};

function intent(
  partial: Partial<MarketIntentRecord> & Pick<MarketIntentRecord, "id" | "eventId" | "role">,
): MarketIntentRecord {
  return {
    categoryId: "market.phone",
    title: "아이폰 15",
    priceMinKrw: 600_000,
    priceMaxKrw: 800_000,
    radiusKm: 5,
    anchorLat: 37.544,
    anchorLng: 127.055,
    placeLabel: "성수동",
    peakHour: "15:00 - 16:00",
    confirmedAtIso: "2026-06-23T10:00:00+09:00",
    active: true,
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      productName: "아이폰 15",
      prioritySlots: {
        price: 700_000,
        battery_health: 80,
        cosmetic_grade: "good",
      },
    },
    ...partial,
  };
}

function main() {
  const seeking = normalizeMarketIntentFromText({
    text: "아이폰 15 삽니다 80만 이하",
    eventId: "ev-seek",
  });
  assert.ok(seeking);
  assert.equal(seeking!.role, "seeking");
  assert.equal(seeking!.detail.prioritySchemaVersion, "market.v1.2");

  const listing = normalizeMarketIntentFromText({
    text: "아이폰 15 프로 팝니다 70만원",
    eventId: "ev-list",
  });
  assert.ok(listing);
  assert.equal(listing!.detail.productName, "아이폰 15 프로");

  const offer = resolveMarketAlignment({
    intents: [
      intent({ id: "mi-1", eventId: "ev-seek", role: "seeking" }),
      intent({
        id: "mi-2",
        eventId: "ev-list",
        role: "listing",
        priceMinKrw: 650_000,
        priceMaxKrw: 750_000,
        anchorLat: 37.545,
        anchorLng: 127.056,
        detail: {
          ...DEFAULT_MARKET_INTENT_DETAIL,
          productName: "아이폰 15 프로",
          prioritySlots: {
            price: 700_000,
            battery_health: 85,
            cosmetic_grade: "good",
          },
        },
      }),
    ],
    copy,
  });
  assert.ok(offer);
  assert.equal(offer!.sourceRef, "market:alignment_v1.2");
  assert.ok((offer!.alignmentScore ?? 0) >= 0.72);
  assert.ok(offer!.priorityHintKo);

  const miss = resolveMarketAlignment({
    intents: [
      intent({ id: "mi-3", eventId: "ev-a", role: "seeking", priceMaxKrw: 100_000 }),
      intent({
        id: "mi-4",
        eventId: "ev-b",
        role: "listing",
        priceMinKrw: 500_000,
        priceMaxKrw: 600_000,
        detail: {
          ...DEFAULT_MARKET_INTENT_DETAIL,
          prioritySlots: { price: 550_000, battery_health: 90, cosmetic_grade: "good" },
        },
      }),
    ],
    copy,
  });
  assert.equal(miss, null);

  console.log("test-market-alignment: ok");
}

main();
