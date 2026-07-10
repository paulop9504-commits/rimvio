import assert from "node:assert/strict";

import { buildLodgingYouTubeEmbedUrl } from "../lib/globe/lodging/build-lodging-youtube-embed-url";
import { computeLodgingYouTubeConfidence } from "../lib/globe/lodging/compute-lodging-youtube-confidence";
import { LODGING_YOUTUBE_CONFIDENCE_GATE } from "../lib/globe/lodging/lodging-youtube-preview-types";

assert.equal(LODGING_YOUTUBE_CONFIDENCE_GATE, 0.95);

assert.ok(
  computeLodgingYouTubeConfidence({
    placeName: "HOTEL LiVEMAX Osaka Yodoyabashi",
    title: "HOTEL LiVEMAX Osaka Yodoyabashi 룸투어",
    channelTitle: "여행브이로그",
  }) >= 0.95,
);

assert.ok(
  computeLodgingYouTubeConfidence({
    placeName: "HOTEL LiVEMAX Osaka Yodoyabashi",
    title: "오사카 TOP 10 호텔 추천",
    channelTitle: "travel",
  }) < 0.95,
);

const shortEmbed = buildLodgingYouTubeEmbedUrl({
  videoId: "abc123",
  durationSeconds: 45,
});
assert.equal(shortEmbed.isShort, true);
assert.match(shortEmbed.embedUrl, /youtube-nocookie\.com\/embed\/abc123/);
assert.match(shortEmbed.embedUrl, /loop=1/);

const clipEmbed = buildLodgingYouTubeEmbedUrl({
  videoId: "xyz789",
  durationSeconds: 600,
});
assert.equal(clipEmbed.isShort, false);
assert.match(clipEmbed.embedUrl, /end=12/);

console.log("test-lodging-youtube-preview: ok");
