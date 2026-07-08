import assert from "node:assert/strict";
import {
  resolvePlaceReviewQueryLang,
  scoreKoreanAudienceMatch,
} from "../lib/globe/place-review-video";

assert.equal(
  resolvePlaceReviewQueryLang({ audienceLocale: "ko", mapRegion: "jp" }),
  "ko",
  "Korean UI on Osaka pin must prefer Korean review search",
);
assert.equal(
  resolvePlaceReviewQueryLang({ audienceLocale: "ja", mapRegion: "jp" }),
  "ja",
);
assert.equal(
  resolvePlaceReviewQueryLang({ audienceLocale: null, mapRegion: "jp" }),
  "ja",
);
assert.equal(
  resolvePlaceReviewQueryLang({ audienceLocale: "en", mapRegion: "jp" }),
  "en",
);
assert.equal(
  resolvePlaceReviewQueryLang({ audienceLocale: "ko", mapRegion: "kr" }),
  "ko",
);

assert.ok(
  scoreKoreanAudienceMatch({
    title: "오사카 본가시바토 장어덮밥 후기",
    channelTitle: "여행하는한국인",
  }) >
    scoreKoreanAudienceMatch({
      title: "本家柴藤 うなぎ",
      channelTitle: "大阪グルメ旅",
    }),
);

console.log("test-place-review-korean-audience: ok");
