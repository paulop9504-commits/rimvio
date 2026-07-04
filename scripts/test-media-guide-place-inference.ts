#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { inferMediaGuidePlaceCandidates } from "../lib/ontology/media-guide-place-inference";

const event: EventCandidate = {
  id: "ev-media-guide-inference",
  title: "교토 여행 준비",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  place: "교토 후시미 이나리",
  confidence: 0.93,
  lifecycleUpdatedAt: "2026-07-04T08:00:00.000Z",
  createdAt: "2026-07-04T08:00:00.000Z",
  updatedAt: "2026-07-04T08:00:00.000Z",
};

const candidates = inferMediaGuidePlaceCandidates({
  event,
  guide: {
    guideNodeId: "guide:ev-media-guide-inference:demo",
    title: "교토 밤 산책",
    description: "역 이동 팁과 밤 동선 정리",
    moments: [
      {
        seconds: 45,
        timeLabel: "0:45",
        title: "후시미 이나리 입구",
        chipLabelKo: "0:45 후시미 이나리 입구",
      },
    ],
    relatedPlaceLabel: "교토 후시미 이나리",
  },
  capturePlaceLabel: "교토 후시미 이나리",
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
});

assert.ok(candidates.length >= 3, "should infer multiple candidates from chapters and text cues");

const explicitPlace = candidates.find((candidate) => /후시미/u.test(candidate.label));
assert.ok(explicitPlace, "chapter place phrase should produce an explicit place candidate");
assert.equal(explicitPlace?.semanticType, "place");

const subtitleEatery = candidates.find(
  (candidate) => candidate.source === "subtitle" && candidate.semanticType === "eatery",
);
assert.ok(subtitleEatery, "subtitle cue should generate an eatery candidate");
assert.match(
  subtitleEatery?.searchProfile.query ?? "",
  /교토역|라멘|맛집/u,
  "subtitle eatery query should carry locality and cuisine",
);
assert.ok(
  subtitleEatery?.situationalHintsKo.includes("늦은 시간"),
  "subtitle eatery should keep phase hints",
);

const transcriptLodging = candidates.find(
  (candidate) => candidate.source === "transcript" && candidate.semanticType === "lodging",
);
assert.ok(transcriptLodging, "transcript cue should generate a lodging candidate");
assert.ok(
  transcriptLodging?.situationalHintsKo.includes("체크인 뒤"),
  "transcript lodging should keep relation-to-phase hints",
);
assert.match(
  transcriptLodging?.searchProfile.query ?? "",
  /숙소|hotel/u,
  "transcript lodging query should remain search-ready",
);

console.log("test-media-guide-place-inference: ok");
