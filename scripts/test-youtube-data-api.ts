#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  parseYouTubeIsoDurationSeconds,
  pickBestYouTubeThumbnail,
  resolveYouTubeDataApiKey,
  resolveYouTubeOfficialVideoBundle,
} from "../lib/media/youtube-data-api";

const originalFetch = globalThis.fetch;
const originalEnv = {
  YOUTUBE_DATA_API_KEY: process.env.YOUTUBE_DATA_API_KEY,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function main() {
  try {
    delete process.env.YOUTUBE_DATA_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    assert.equal(resolveYouTubeDataApiKey(), null);

    process.env.GOOGLE_MAPS_API_KEY = "maps-key";
    assert.equal(resolveYouTubeDataApiKey()?.name, "GOOGLE_MAPS_API_KEY");

    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    assert.equal(resolveYouTubeDataApiKey()?.name, "GOOGLE_PLACES_API_KEY");

    process.env.YOUTUBE_DATA_API_KEY = "youtube-key";
    assert.equal(resolveYouTubeDataApiKey()?.name, "YOUTUBE_DATA_API_KEY");

    assert.equal(parseYouTubeIsoDurationSeconds("PT1H2M3S"), 3723);
    assert.equal(
      pickBestYouTubeThumbnail({
        default: "default.jpg",
        medium: null,
        high: "high.jpg",
        standard: null,
        maxres: "maxres.jpg",
      }),
      "maxres.jpg",
    );

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input instanceof URL ? input.href : input));
      assert.equal(url.searchParams.get("key"), "youtube-key");

      if (url.pathname.endsWith("/videos")) {
        return Response.json({
          items: [
            {
              id: "abc123",
              snippet: {
                title: "교토 야식 라멘",
                description: "교토역 근처 라멘과 동선",
                channelId: "channel-1",
                channelTitle: "Kyoto Walk",
                publishedAt: "2026-07-01T10:00:00Z",
                liveBroadcastContent: "none",
                tags: ["교토", "라멘"],
                thumbnails: {
                  high: { url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg" },
                },
              },
              contentDetails: {
                duration: "PT9M5S",
              },
              status: {
                embeddable: true,
              },
            },
          ],
        });
      }

      if (url.pathname.endsWith("/channels")) {
        return Response.json({
          items: [
            {
              id: "channel-1",
              snippet: {
                title: "Kyoto Walk",
                description: "교토 로컬 동선",
                customUrl: "@kyotowalk",
                thumbnails: {
                  high: { url: "https://yt3.googleusercontent.com/channel-1-high.jpg" },
                },
              },
            },
          ],
        });
      }

      if (url.pathname.endsWith("/search")) {
        return Response.json({
          items: [
            {
              id: { videoId: "rel-1" },
              snippet: {
                title: "교토 후시미 이나리 밤 산책",
                description: "후시미 이나리와 교토역 동선",
                channelId: "channel-1",
                channelTitle: "Kyoto Walk",
                publishedAt: "2026-06-30T10:00:00Z",
                thumbnails: {
                  high: { url: "https://i.ytimg.com/vi/rel-1/hqdefault.jpg" },
                },
              },
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch URL: ${url.href}`);
    }) as typeof globalThis.fetch;

    const bundle = await resolveYouTubeOfficialVideoBundle({
      videoId: "abc123",
      includeChannel: true,
      includeRelatedSearchResults: true,
      relatedSearchLimit: 2,
    });

    assert.ok(bundle, "official bundle should resolve when key is configured");
    assert.equal(bundle?.apiKeySource, "YOUTUBE_DATA_API_KEY");
    assert.equal(bundle?.video.title, "교토 야식 라멘");
    assert.equal(bundle?.video.durationSeconds, 545);
    assert.equal(bundle?.channel?.canonicalUrl, "https://www.youtube.com/@kyotowalk");
    assert.equal(bundle?.relatedSearchResults.length, 1);
    assert.equal(
      bundle?.relatedSearchResults[0]?.thumbnailUrl,
      "https://i.ytimg.com/vi/rel-1/hqdefault.jpg",
    );

    console.log("test-youtube-data-api: ok");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
}

void main();
