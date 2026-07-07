#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  composeLodgingMapHintLine,
  resolveContextLodgingMarkerPresentation,
  resolveLodgingMapCue,
} from "../lib/globe/context-condition-ai/resolve-context-lodging-marker-presentation";

const thumb = "https://example.com/hotel.jpg";

assert.equal(
  resolveLodgingMapCue({
    reasonKo: "야경 뷰가 예쁜 호텔",
    rankIndex: 1,
  }),
  "looks",
);

const visual = resolveContextLodgingMarkerPresentation({
  reasonKo: "야경 뷰가 예쁜 호텔",
  priceKrw: 95000,
  thumbnailUrl: thumb,
  rankIndex: 1,
});
assert.equal(visual.displayVariant, "preview_chip");
assert.match(visual.mapHintLine ?? "", /야경/);
assert.equal(visual.discoveryPriceLabel, "₩95,000/박");

const priceLed = resolveContextLodgingMarkerPresentation({
  reasonKo: "가성비 좋은 숙소",
  priceKrw: 72000,
  thumbnailUrl: null,
  rankIndex: 1,
});
assert.equal(priceLed.displayVariant, "price_pill");
assert.equal(priceLed.discoveryPriceLabel, "₩72,000/박");
assert.equal(priceLed.mapHintLine, "가성비");

const near = resolveContextLodgingMarkerPresentation({
  reasonKo: "지금 위치에서 가까워요",
  priceKrw: 120000,
  thumbnailUrl: thumb,
  distanceKm: 0.6,
  rankIndex: 2,
});
assert.equal(near.displayVariant, "reason_chip");
assert.equal(near.mapHintLine, "여기서 가까워요");

const people = resolveContextLodgingMarkerPresentation({
  reasonKo: "민수 다녀간 곳 82%",
  priceKrw: 98000,
  thumbnailUrl: thumb,
  rankIndex: 3,
});
assert.equal(people.displayVariant, "preview_chip");
assert.match(people.mapHintLine ?? "", /민수 다녀간/);

const topPick = resolveContextLodgingMarkerPresentation({
  reasonKo: "맥락·위치 기준 1순위예요",
  priceKrw: 110000,
  thumbnailUrl: thumb,
  rankIndex: 0,
});
assert.equal(topPick.displayVariant, "preview_chip");
assert.match(topPick.mapHintLine ?? "", /1순위/);

const walk = composeLodgingMapHintLine({
  cue: "near",
  reasonKo: "역에서 도보 3분",
  rankIndex: 1,
});
assert.equal(walk, "도보 3분");

const priceFallback = resolveContextLodgingMarkerPresentation({
  reasonKo: "",
  priceKrw: 110000,
  thumbnailUrl: null,
  rankIndex: 0,
});
assert.equal(priceFallback.displayVariant, "price_pill");
assert.equal(priceFallback.discoveryPriceLabel, "₩110,000/박");

console.log("test-context-lodging-marker-presentation: ok");
