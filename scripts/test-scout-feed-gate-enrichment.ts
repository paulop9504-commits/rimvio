import assert from "node:assert/strict";
import { buildScoutFeedGateEnrichment } from "../lib/globe/context-condition-ai/build-scout-feed-gate-enrichment";

const enrichment = buildScoutFeedGateEnrichment({
  anchorPlaceName: "오사카",
  anchorLat: 34.6937,
  anchorLng: 135.5023,
  triggerMessage: "놀거리 찾아줘",
  outcome: {
    recommendations: [
      {
        kind: "activity",
        activitySubtype: "theme_park",
        title: "유니버설 스튜디오 재팬",
        reasonKo: "테마파크·어트랙션 중심",
        rank: 1,
        placeId: "p1",
        lat: 34.6654,
        lng: 135.4323,
      },
      {
        kind: "activity",
        activitySubtype: "landmark",
        title: "도톤보리",
        reasonKo: "저녁 산책·먹거리",
        rank: 2,
        placeId: "p2",
        lat: 34.6687,
        lng: 135.5013,
      },
    ],
    spec: { activityFocus: "놀거리" },
  },
});

assert.equal(enrichment.scoutKind, "activity");
assert.ok(enrichment.aiInsightKo.includes("오사카"));
assert.ok(enrichment.tipsKo.length >= 2);
assert.equal(enrichment.highlightTitles.length, 2);
assert.ok(enrichment.videoContext?.name.includes("오사카"));
assert.equal(enrichment.correctionChips.length, 0);

const bleed = buildScoutFeedGateEnrichment({
  anchorPlaceName: "오사카",
  anchorLat: 34.6937,
  anchorLng: 135.5023,
  triggerMessage: "근처 약국",
  outcome: {
    recommendations: [
      {
        kind: "amenity",
        title: "약국 A",
        reasonKo: "가까움",
        rank: 1,
        placeId: "a1",
        lat: 34.69,
        lng: 135.5,
      },
      {
        kind: "lodging",
        title: "호텔 B",
        reasonKo: "근처",
        rank: 2,
        placeId: "h1",
        lat: 34.691,
        lng: 135.501,
      },
    ],
    spec: {
      version: 1,
      resourceTypes: ["amenity"],
      transport: "walk",
      budget: "medium",
      vibe: "popular",
      lodgingKind: "any",
      radiusM: 600,
    },
  },
});
assert.equal(bleed.scoutKind, "mixed");
assert.ok(bleed.correctionChips.some((chip) => chip.id === "keep_amenity"));
assert.ok(bleed.correctionChips.some((chip) => chip.id === "strip_lodging"));

console.log("test-scout-feed-gate-enrichment: ok");
