#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  buildProactiveSearchQuery,
  discoverProactiveTravelYoutubeGuides,
} from "../lib/ontology/discover-proactive-travel-youtube-guides";

resetEventCandidatesForTests([]);

assert.equal(buildProactiveSearchQuery("도쿄", "jp"), "도쿄 여행");
assert.equal(buildProactiveSearchQuery("Tokyo", "jp"), "Tokyo 旅行");

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("/youtube/v3/search")) {
    return new Response(
      JSON.stringify({
        items: [
          {
            id: { videoId: "tokyo-vlog-1" },
            snippet: {
              title: "도쿄 여행 브이로그",
              description: "신주쿠에서 시작하는 도쿄 동선",
              channelTitle: "Travel KO",
              publishedAt: "2026-06-01T00:00:00Z",
            },
          },
          {
            id: { videoId: "tokyo-vlog-2" },
            snippet: {
              title: "Tokyo night walk",
              description: "Shibuya to Shinjuku",
              channelTitle: "Night Walk JP",
              publishedAt: "2026-06-02T00:00:00Z",
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  if (url.includes("/youtube/v3/videos")) {
    return new Response(
      JSON.stringify({
        items: [
          {
            id: "tokyo-vlog-1",
            snippet: {
              title: "도쿄 여행 브이로그",
              description: "신주쿠에서 시작하는 도쿄 동선",
              channelTitle: "Travel KO",
              publishedAt: "2026-06-01T00:00:00Z",
            },
            contentDetails: { duration: "PT8M12S" },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  return originalFetch(input);
};

process.env.YOUTUBE_DATA_API_KEY = "test-key";

const event = commitEventUpsert({
  id: "ev-tokyo-proactive-yt",
  title: "도쿄 여행",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  place: "도쿄",
  metadata: {
    feedPlanEnabled: true,
    canonicalPlaceProfile: {
      label: "도쿄",
      lat: 35.681,
      lng: 139.767,
      countryCode: "JP",
      searchHints: { countryBias: "jp", providerBias: "google_places" },
    },
  },
});

void discoverProactiveTravelYoutubeGuides(event).then((guides) => {
  assert.ok(guides.length >= 1, "should discover at least one proactive youtube guide");
  assert.match(guides[0]?.guideNodeId ?? "", /proactive-yt:tokyo-vlog-1/);
  assert.equal(guides[0]?.embedUrl, "https://www.youtube.com/embed/tokyo-vlog-1");
  assert.match(guides[0]?.whyRelevantKo ?? "", /도쿄/);
  console.log("test-proactive-travel-youtube-guides: ok");
}).finally(() => {
  globalThis.fetch = originalFetch;
});
