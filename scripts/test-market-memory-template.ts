#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveMarketMemoryTemplate } from "../lib/globe/market/memory/market-memory-template";
import { generateMarketExperienceTags } from "../lib/globe/market/memory/generate-market-experience-tags";
import { scoreMarketExperienceTagAlignment } from "../lib/globe/market/memory/score-market-memory-alignment";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";

function intent(
  partial: Partial<MarketIntentRecord> & Pick<MarketIntentRecord, "role">,
): MarketIntentRecord {
  return {
    id: partial.role,
    eventId: partial.role,
    categoryId: "market.camping",
    title: "2인 텐트",
    priceMinKrw: 150_000,
    priceMaxKrw: 150_000,
    radiusKm: 5,
    anchorLat: 37.5,
    anchorLng: 127.0,
    placeLabel: "강원도",
    peakHour: null,
    confirmedAtIso: "2026-06-23T10:00:00+09:00",
    active: true,
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      productName: "2인 텐트",
      memoryRecord: {
        ...DEFAULT_MARKET_INTENT_DETAIL.memoryRecord,
        categoryAnswer: "5회 사용",
        experienceTags: ["강원·밤", "차박"],
      },
    },
    ...partial,
  };
}

function main() {
  const camera = resolveMarketMemoryTemplate("market.camera", "Sony A7");
  assert.equal(camera.id, "camera");

  const camping = resolveMarketMemoryTemplate("market.general", "캠핑 텐트");
  assert.equal(camping.id, "camping");

  const tags = generateMarketExperienceTags({
    categoryId: "market.bike",
    productName: "로드 자전거",
    placeLabel: "한강",
    memory: {
      story: "벚꽃 시즌 라이딩",
      care: "",
      why: "",
      categoryAnswer: "",
      seekingContext: "",
      seekingWhy: "",
      experienceTags: [],
      templateId: "bike",
      schemaVersion: "market.memory.v1",
    },
  });
  assert.ok(tags.some((tag) => tag.includes("라이딩") || tag.includes("봄")));

  const seeking = intent({
    role: "seeking",
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      memoryRecord: {
        ...DEFAULT_MARKET_INTENT_DETAIL.memoryRecord,
        seekingContext: "강원 차박용",
        experienceTags: ["강원·밤", "차박"],
      },
    },
  });
  const listing = intent({ role: "listing" });
  assert.ok(scoreMarketExperienceTagAlignment(seeking, listing) >= 0.75);

  console.log("test-market-memory-template: ok");
}

main();
