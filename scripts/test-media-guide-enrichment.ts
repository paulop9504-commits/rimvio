#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { FEED_CAPTURES_META_KEY } from "../lib/events/event-metadata-keys";
import {
  queryMediaGuidesForEntity,
  replaceMediaGuidesForExperience,
  resetMediaGuideStoreForTests,
  resolveMediaGuideNodesForEvent,
} from "../lib/ontology";
import { asRimvioEntityId } from "../lib/ontology/entity-types";
import {
  patchMediaGuideCandidatesToProjection,
  patchMediaGuidesToProjection,
  resetProjectionStoreForTests,
} from "../lib/situation-projection";

const originalFetch = globalThis.fetch;
const originalYouTubeKey = process.env.YOUTUBE_DATA_API_KEY;

process.env.YOUTUBE_DATA_API_KEY = "yt-test-key";

resetMediaGuideStoreForTests();
resetProjectionStoreForTests();

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input instanceof URL ? input.href : input);

  if (url.includes("youtube.com/oembed")) {
    return Response.json({
      title: "교토역 야식 라멘 가이드",
      thumbnail_url: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
      author_name: "Walk Studio",
    });
  }

  if (url.includes("youtube.com/watch?v=abc123")) {
    return new Response(
      `
      <!doctype html>
      <html>
        <head>
          <title>교토역 야식 라멘 가이드</title>
          <meta property="og:title" content="교토역 야식 라멘 가이드" />
          <meta property="og:description" content="00:45 후시미 이나리 입구&#10;05:20 교토역 근처 라멘 야식" />
          <meta property="og:image" content="https://img.youtube.com/vi/abc123/maxresdefault.jpg" />
          <link rel="canonical" href="https://www.youtube.com/watch?v=abc123" />
        </head>
        <body>
          "lengthSeconds":"821"
        </body>
      </html>
      `,
      {
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  if (url.includes("youtube.googleapis.com/youtube/v3/videos") || url.includes("www.googleapis.com/youtube/v3/videos")) {
    return Response.json({
      items: [
        {
          id: "abc123",
          snippet: {
            title: "교토역 야식 라멘 가이드 · 공식 메타",
            description:
              "00:45 후시미 이나리 입구\n05:20 교토역 근처 라멘 야식\n08:10 체크인 뒤 역 근처 숙소",
            channelId: "channel-kyoto",
            channelTitle: "Kyoto Walk Studio",
            publishedAt: "2026-06-29T12:34:56Z",
            liveBroadcastContent: "none",
            tags: ["교토", "라멘", "후시미 이나리"],
            thumbnails: {
              high: { url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg" },
              maxres: { url: "https://i.ytimg.com/vi/abc123/maxresdefault.jpg" },
            },
          },
          contentDetails: {
            duration: "PT13M41S",
          },
        },
      ],
    });
  }

  if (url.includes("youtube.googleapis.com/youtube/v3/channels") || url.includes("www.googleapis.com/youtube/v3/channels")) {
    return Response.json({
      items: [
        {
          id: "channel-kyoto",
          snippet: {
            title: "Kyoto Walk Studio",
            description: "교토 동선과 먹거리 가이드",
            customUrl: "@kyotowalkstudio",
            thumbnails: {
              high: { url: "https://yt3.googleusercontent.com/channel-kyoto-high.jpg" },
            },
          },
        },
      ],
    });
  }

  if (url.includes("youtube.googleapis.com/youtube/v3/search") || url.includes("www.googleapis.com/youtube/v3/search")) {
    return Response.json({
      items: [
        {
          id: { videoId: "rel-1" },
          snippet: {
            title: "교토 후시미 이나리 새벽 산책",
            description: "교토 후시미 이나리 입구와 동선 정리",
            channelId: "channel-kyoto",
            channelTitle: "Kyoto Walk Studio",
            publishedAt: "2026-06-28T09:00:00Z",
            thumbnails: {
              high: { url: "https://i.ytimg.com/vi/rel-1/hqdefault.jpg" },
            },
          },
        },
        {
          id: { videoId: "rel-2" },
          snippet: {
            title: "오사카 카페 산책",
            description: "오사카 카페만 모은 영상",
            channelId: "channel-osaka",
            channelTitle: "Osaka Walk Studio",
            publishedAt: "2026-06-27T09:00:00Z",
            thumbnails: {
              high: { url: "https://i.ytimg.com/vi/rel-2/hqdefault.jpg" },
            },
          },
        },
      ],
    });
  }

  if (url === "https://visit.kyoto.travel/fushimi-inari") {
    return new Response(
      `
      <!doctype html>
      <html>
        <head>
          <title>Fushimi Inari Official Guide</title>
          <meta name="description" content="Official visitor guide for Fushimi Inari Taisha in Kyoto." />
          <meta property="og:image" content="https://visit.kyoto.travel/inari.jpg" />
          <link rel="canonical" href="https://visit.kyoto.travel/fushimi-inari" />
        </head>
        <body></body>
      </html>
      `,
      {
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  throw new Error(`Unexpected fetch URL: ${url}`);
}) as typeof globalThis.fetch;

const event: EventCandidate = {
  id: "ev-guide-kyoto",
  title: "교토 여행 준비",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  place: "교토 후시미 이나리",
  confidence: 0.92,
  metadata: {
    [FEED_CAPTURES_META_KEY]: [
      {
        id: "cap-youtube",
        kind: "link",
        capturedAtIso: "2026-07-04T08:00:00.000Z",
        placeLabel: "교토 후시미 이나리",
        url: "https://www.youtube.com/watch?v=abc123&t=45s",
        mediaTextSignals: [
          {
            source: "subtitle",
            text: "교토역 근처에서 늦은 라멘 먹기 좋았어요",
            startSeconds: 412,
          },
          {
            source: "transcript",
            text: "체크인하고 바로 갈 수 있는 역 근처 숙소도 많아요",
            startSeconds: 615,
          },
        ],
      },
      {
        id: "cap-official",
        kind: "link",
        capturedAtIso: "2026-07-04T08:05:00.000Z",
        placeLabel: "교토",
        url: "https://visit.kyoto.travel/fushimi-inari",
      },
    ],
  },
  lifecycleUpdatedAt: "2026-07-04T07:55:00.000Z",
  createdAt: "2026-07-04T07:50:00.000Z",
  updatedAt: "2026-07-04T08:06:00.000Z",
};

async function main() {
  try {
    const guides = await resolveMediaGuideNodesForEvent(event);
    assert.equal(guides.length, 2);

    const youtubeGuide = guides.find((guide) => guide.sourceKind === "youtube");
    assert.ok(youtubeGuide, "youtube capture should become a guide node");
    assert.equal(youtubeGuide?.trustLabelKo, "영상");
    assert.equal(youtubeGuide?.primaryMoment?.timeLabel, "0:45");
    assert.equal(youtubeGuide?.providerName, "Kyoto Walk Studio");
    assert.equal(youtubeGuide?.thumbnailUrl, "https://i.ytimg.com/vi/abc123/maxresdefault.jpg");
    assert.equal(youtubeGuide?.durationSeconds, 821);
    assert.ok(
      youtubeGuide?.embedUrl?.includes("https://www.youtube.com/embed/abc123"),
      "youtube guide should expose an embed URL",
    );
    assert.equal(youtubeGuide?.youtubeOfficial?.apiKeySource, "YOUTUBE_DATA_API_KEY");
    assert.equal(youtubeGuide?.youtubeOfficial?.publishedAt, "2026-06-29T12:34:56Z");
    assert.equal(
      youtubeGuide?.youtubeOfficial?.channelUrl,
      "https://www.youtube.com/@kyotowalkstudio",
    );
    assert.equal(youtubeGuide?.youtubeOfficial?.relatedSearchResults.length, 2);
    assert.match(
      youtubeGuide?.whyRelevantKo ?? "",
      /교토|0:45/,
      "youtube guide should explain place or timestamp relevance",
    );
    assert.ok(
      (youtubeGuide?.inferredPlaceCandidates.length ?? 0) >= 2,
      "youtube guide should infer multiple place candidates from title/description layers",
    );
    assert.ok(
      youtubeGuide?.inferredPlaceCandidates.some((candidate) => /후시미/u.test(candidate.label)),
      "youtube guide should infer an explicit place-like candidate",
    );
    assert.ok(
      youtubeGuide?.inferredPlaceCandidates.some(
        (candidate) =>
          candidate.semanticType === "eatery" &&
          candidate.cuisineHint === "라멘" &&
          candidate.situationalHintsKo.includes("늦은 시간"),
      ),
      "youtube guide should preserve softer cuisine and late-night cues as candidates",
    );
    assert.ok(
      youtubeGuide?.inferredPlaceCandidates.some(
        (candidate) =>
          candidate.semanticType === "eatery" &&
          /교토|라멘|맛집/u.test(candidate.searchProfile.query),
      ),
      "media text cues should feed area-aware candidate queries",
    );

    const officialGuide = guides.find((guide) => guide.trustLevel === "official");
    assert.ok(officialGuide, "official public page should be labeled as official");
    assert.equal(officialGuide?.sourceKind, "public_page");
    assert.ok(
      officialGuide?.thumbnailUrl?.includes("visit.kyoto.travel"),
      "public page guide should keep og:image metadata",
    );
    assert.ok(
      (officialGuide?.inferredPlaceCandidates.length ?? 0) >= 1,
      "official guide should still infer at least one place candidate",
    );

    replaceMediaGuidesForExperience({
      experienceEntityId: asRimvioEntityId("experience", event.id),
      guides,
    });

    const experienceGuides = queryMediaGuidesForEntity(
      asRimvioEntityId("experience", event.id),
    );
    assert.equal(experienceGuides.length, 2);

    const placeEntityId = officialGuide?.relatedPlaceEntityId;
    assert.ok(placeEntityId, "guide should attach to a related place entity");
    const placeGuides = queryMediaGuidesForEntity(placeEntityId!);
    assert.ok(
      placeGuides.some((guide) => guide.guideNodeId === officialGuide?.guideNodeId),
      "place lookup should return attached guide evidence",
    );

    const projection = patchMediaGuideCandidatesToProjection({
      event,
      guide: youtubeGuide!,
    });
    assert.ok(projection, "guide candidates should patch into the projection manifest");
    const mediaNodes =
      projection?.nodes.filter(
        (node) =>
          node.kind === "ghost" &&
          node.candidateOrigin === "media_inferred" &&
          node.sourceGuideNodeId === youtubeGuide?.guideNodeId,
      ) ?? [];
    assert.ok(mediaNodes.length >= 2, "projection should carry guide-derived candidate ghost nodes");
    assert.ok(
      mediaNodes.every((node) => node.relationLabelKo === "미디어 후보"),
      "projection nodes should be clearly marked as media candidates",
    );

    const multiGuideProjection = patchMediaGuidesToProjection({
      event,
      guides,
      maxGuides: 2,
    });
    assert.ok(multiGuideProjection, "multiple media guides should patch into the same projection");
    const projectedGuideIds = new Set(
      multiGuideProjection?.nodes.flatMap((node) =>
        node.kind === "ghost" && node.sourceGuideNodeId ? [node.sourceGuideNodeId] : [],
      ) ?? [],
    );
    assert.ok(
      projectedGuideIds.has(youtubeGuide!.guideNodeId) &&
        projectedGuideIds.has(officialGuide!.guideNodeId),
      "projection should preserve nodes from the top guide set",
    );

    console.log("test-media-guide-enrichment: ok");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalYouTubeKey == null) {
      delete process.env.YOUTUBE_DATA_API_KEY;
    } else {
      process.env.YOUTUBE_DATA_API_KEY = originalYouTubeKey;
    }
  }
}

void main();
