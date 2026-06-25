#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { classifyExternalQueryIntent } from "../lib/external-context-ask/classify-external-query-intent";
import { resolveExternalContextAsk } from "../lib/external-context-ask/resolve-external-context-ask";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import type { ExternalContextSources } from "../lib/external-context-ask/external-context-opportunity-types";

const now = new Date("2026-06-10T14:00:00.000Z");

const sources: ExternalContextSources = {
  alignmentChats: [
    {
      handshakeId: "hs-iphone",
      threadId: "thread-iphone",
      phase: "active",
      portalCategoryId: "used_goods",
      title: "아이폰 15 프로",
      placeLabel: "강남",
      otherUserId: "user-b",
      otherDisplayName: "민수",
      otherAvatarUrl: null,
      otherRole: "seeking",
      updatedAtIso: "2026-06-09T10:00:00.000Z",
    },
  ],
  marketIntents: [
    {
      id: "mi-iphone",
      eventId: "ev-market-iphone",
      role: "listing",
      categoryId: "market.phone",
      title: "아이폰 14 팝니다",
      priceMinKrw: 700_000,
      priceMaxKrw: 750_000,
      radiusKm: 5,
      anchorLat: 37.4979,
      anchorLng: 127.0276,
      placeLabel: "역삼",
      peakHour: null,
      confirmedAtIso: "2026-06-08T12:00:00.000Z",
      active: true,
      detail: {
        ...DEFAULT_MARKET_INTENT_DETAIL,
        publishedExternal: true,
      },
    },
    {
      id: "mi-bike",
      eventId: "ev-market-bike",
      role: "listing",
      categoryId: "market.bike",
      title: "로드 자전거",
      priceMinKrw: 300_000,
      priceMaxKrw: 350_000,
      radiusKm: 8,
      anchorLat: 37.55,
      anchorLng: 127.0,
      placeLabel: "성수",
      peakHour: null,
      confirmedAtIso: "2026-06-01T12:00:00.000Z",
      active: true,
      detail: {
        ...DEFAULT_MARKET_INTENT_DETAIL,
        publishedExternal: true,
      },
    },
  ],
  traces: [
    {
      traceId: "trace-jeju",
      eventId: "ev-trace-jeju",
      title: "제주 여행 모집",
      placeLabel: "제주시",
      lat: 33.4996,
      lng: 126.5312,
      authorUserId: "user-c",
      authorDisplayName: "지은",
      photoCount: 2,
      videoCount: 0,
      startedAtIso: "2026-06-07T08:00:00.000Z",
      recallLine: "이번 주말 제주 동행",
      pioneerCell: null,
    },
  ],
};

assert.equal(classifyExternalQueryIntent("아이폰 팔고 싶어"), "trade");
assert.equal(classifyExternalQueryIntent("제주도 같이 갈 사람"), "travel");
assert.equal(classifyExternalQueryIntent("이번 주말 뭐하지"), "gathering");

const tradeResult = resolveExternalContextAsk({
  query: "아이폰 팔고 싶어",
  sources,
  lat: 37.5,
  lng: 127.03,
  now,
});

assert.equal(tradeResult.kind, "opportunities");
assert.ok(tradeResult.hits.length >= 2);
assert.match(tradeResult.narrativeKo, /거래/);
assert.ok(
  tradeResult.hits.some((hit) => hit.title.includes("아이폰")),
  "trade query should rank iPhone opportunities",
);
assert.equal(tradeResult.recommendedHitId, tradeResult.hits[0]?.id);

const travelResult = resolveExternalContextAsk({
  query: "제주도 같이 갈 사람 찾아줘",
  sources,
  now,
});

assert.equal(travelResult.kind, "opportunities");
assert.ok(
  travelResult.hits.some((hit) => hit.placeLabel.includes("제주")),
  "travel query should surface Jeju trace",
);

const emptyResult = resolveExternalContextAsk({
  query: "아이폰 팔고 싶어",
  sources: { alignmentChats: [], marketIntents: [], traces: [] },
  now,
});

assert.equal(emptyResult.kind, "empty");
assert.match(emptyResult.narrativeKo, /맞춤/);

console.log("test-external-context-ask: ok");
