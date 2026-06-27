import assert from "node:assert/strict";
import { detectLodgingSearchIntent } from "../lib/globe/lodging/detect-lodging-search-intent";
import { explainLodgingRecommendationKo } from "../lib/globe/lodging/explain-lodging-recommendation-ko";

assert.ok(detectLodgingSearchIntent("나 숙소 구해야해"));
assert.ok(detectLodgingSearchIntent("호텔 추천해줘"));
assert.equal(detectLodgingSearchIntent("맛집 추천"), null);

const reason = explainLodgingRecommendationKo({
  peoplePlaceMatch: { displayName: "정성", placeLabel: "오사카" },
  travelTrajectory: true,
  distanceKm: 2,
});
assert.ok(reason.reasonKo.includes("정성"));
assert.ok(reason.matchReasons.length >= 2);

console.log("test-lodging-discovery-intent: ok");
