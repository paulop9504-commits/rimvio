import assert from "node:assert/strict";
import {
  resolvePlaceReviewQueryLang,
  scoreKoreanAudienceMatch,
  scorePlaceNameMatch,
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

assert.ok(
  scorePlaceNameMatch({
    placeName: "호텔 브라이튼 시티 오사카 기타하마",
    title: "오사카 기타하마 호텔 브라이튼 룸투어",
    channelTitle: "여행브이로그",
  }) >
    scorePlaceNameMatch({
      placeName: "호텔 브라이튼 시티 오사카 기타하마",
      title: "神戸ホテル ルームツアー",
      channelTitle: "関西旅行",
    }),
  "hotel-specific title must outrank wrong-city lodging video",
);

console.log("test-place-review-korean-audience: ok");
