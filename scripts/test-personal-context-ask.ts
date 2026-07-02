#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { bindSituation } from "../lib/context-run/bind-situation";
import { planContextRun } from "../lib/context-run/plan-context-run";
import { GLOBE_CONTEXT_NOTE_KEY } from "../lib/globe/pin-context-note";
import { parsePersonalContextQuery } from "../lib/personal-context-ask/parse-personal-context-query";
import { resolvePersonalContextAsk } from "../lib/personal-context-ask/resolve-personal-context-ask";
import { buildBridgeContextThreadId } from "../lib/peer-chat/bridge-context-thread";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-pca-base",
    title: "테스트",
    category: "travel",
    source: "message",
    lifecycle: "completed",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const now = new Date("2026-06-10T14:00:00.000Z");

const jejuLastYear = baseEvent({
  id: "ev-jeju",
  title: "제주 여행",
  place: "제주시",
  datetime: "2025-06-10T14:00:00.000Z",
  metadata: {
    planPeerDisplayName: "민수",
    feedPlanEnabled: true,
    [GLOBE_CONTEXT_NOTE_KEY]: "카페 투어",
  },
});

const momRestaurant = baseEvent({
  id: "ev-mom",
  title: "점심",
  place: "강남 파스타",
  datetime: "2026-05-02T12:00:00.000Z",
  metadata: {
    attendees: ["엄마"],
    [GLOBE_CONTEXT_NOTE_KEY]: "맛집 추천",
  },
});

const cheolsuMeet = baseEvent({
  id: "ev-cheolsu",
  title: "커피",
  place: "홍대 카페",
  datetime: "2026-06-08T10:00:00.000Z",
  metadata: {
    planPeerDisplayName: "철수",
  },
});

const olderCheolsu = baseEvent({
  id: "ev-cheolsu-old",
  title: "저녁",
  place: "이태원",
  datetime: "2026-03-01T19:00:00.000Z",
  metadata: {
    planPeerDisplayName: "철수",
  },
});

const weekSchedule = baseEvent({
  id: "ev-week",
  title: "치과",
  datetime: "2026-06-12T09:00:00.000Z",
  metadata: {
    gcalEventId: "gcal-1",
  },
});

const events = [
  jejuLastYear,
  momRestaurant,
  cheolsuMeet,
  olderCheolsu,
  weekSchedule,
];

const parsedJeju = parsePersonalContextQuery("작년 제주", now);
assert.equal(parsedJeju.intent, "travel_recall");
assert.ok(parsedJeju.placeNeedles.includes("제주"));
assert.equal(parsedJeju.year, 2025);

const jejuResult = resolvePersonalContextAsk({
  query: "작년 제주",
  events,
  scope: "personal",
  now,
});
assert.equal(jejuResult.kind, "bridges");
assert.ok(jejuResult.hits.some((hit) => hit.eventId === "ev-jeju"));

const cheolsuResult = resolvePersonalContextAsk({
  query: "철수랑 마지막으로 만난 곳",
  events,
  scope: "personal",
  now,
});
assert.equal(cheolsuResult.hits[0]?.eventId, "ev-cheolsu");
assert.ok(cheolsuResult.summaryKo.includes("홍대"));

const momResult = resolvePersonalContextAsk({
  query: "엄마랑 갔던 맛집",
  events,
  scope: "personal",
  now,
});
assert.ok(momResult.hits.some((hit) => hit.eventId === "ev-mom"));

const scheduleResult = resolvePersonalContextAsk({
  query: "이번 주 일정",
  events,
  scope: "personal",
  now,
});
assert.equal(scheduleResult.kind, "schedule");
assert.ok(scheduleResult.hits.some((hit) => hit.eventId === "ev-week"));

const emptyResult = resolvePersonalContextAsk({
  query: "우주 여행",
  events,
  scope: "personal",
  now,
});
assert.equal(emptyResult.kind, "empty");
assert.ok(emptyResult.summaryKo.includes("찾지 못했"));

const externalResult = resolvePersonalContextAsk({
  query: "맞춤 모임",
  events,
  scope: "discovery",
  now,
});
assert.equal(externalResult.kind, "external_soon");
assert.equal(externalResult.totalPhotoCount, 0);

const shanghaiTrip = baseEvent({
  id: "ev-shanghai",
  title: "정성이랑 여행",
  place: "상하이",
  datetime: "2025-01-12T10:00:00.000Z",
  metadata: {
    planPeerDisplayName: "정성",
    planWindowEndIso: "2025-01-15T10:00:00.000Z",
    [GLOBE_CONTEXT_NOTE_KEY]: "와이탄 · 동방명주",
    feedCaptures: [
      {
        id: "p-sh-1",
        kind: "photo",
        capturedAtIso: "2025-01-12T11:00:00.000Z",
        url: "https://example.com/shanghai-1.jpg",
        verified: true,
      },
      {
        id: "p-sh-2",
        kind: "photo",
        capturedAtIso: "2025-01-12T12:00:00.000Z",
        url: "https://example.com/shanghai-2.jpg",
        verified: true,
      },
    ],
  },
});

const photoParsed = parsePersonalContextQuery(
  "정성이랑 상하이에서 찍은 사진좀 꺼내줘",
  now,
);
assert.equal(photoParsed.intent, "bridge_context");
assert.equal(photoParsed.target, "photo");
assert.equal(photoParsed.responseFocus, "photos");
assert.ok(photoParsed.personNeedles.includes("정성"));
assert.ok(photoParsed.placeNeedles.includes("상하이"));

const whereWithPerson = parsePersonalContextQuery("정성이랑 어디 갔어", now);
assert.equal(whereWithPerson.intent, "bridge_context");
assert.ok(whereWithPerson.personNeedles.includes("정성"));

const whereAskPlan = planContextRun(
  bindSituation({
    kind: "text",
    text: "정성이랑 어디 갔어",
    surface: "capture_sheet",
    layerMode: "personal",
    contextEventId: null,
  }),
);
assert.equal(whereAskPlan.kind, "personal_context_ask");

const photoResult = resolvePersonalContextAsk({
  query: "정성이랑 상하이에서 찍은 사진좀 꺼내줘",
  events: [...events, shanghaiTrip],
  scope: "personal",
  now,
});
assert.equal(photoResult.kind, "bridges");
assert.equal(photoResult.totalPhotoCount, 2);
assert.ok(photoResult.narrativeKo.includes("정성과"));
assert.ok(photoResult.narrativeKo.includes("사진"));
assert.ok(photoResult.narrativeKo.includes("저장되어"));
assert.ok(photoResult.featuredHitId === "ev-shanghai");
assert.ok(photoResult.hits.some((hit) => hit.eventId === "ev-shanghai"));
assert.equal(photoResult.hits[0]?.photoPreviews.length, 2);
assert.ok(photoResult.recallContext);
assert.equal(
  photoResult.recallContext.contextTalkThreadId,
  buildBridgeContextThreadId("ev-shanghai"),
);
assert.ok(photoResult.recallContext.coExperienceCount >= 1);

const shanghaiBusiness = baseEvent({
  id: "ev-sh-biz",
  title: "상하이 출장",
  place: "상하이",
  datetime: "2025-02-01T10:00:00.000Z",
  metadata: { planPeerDisplayName: "정성" },
});

const multiResult = resolvePersonalContextAsk({
  query: "정성이랑 상하이",
  events: [...events, shanghaiTrip, shanghaiBusiness],
  scope: "personal",
  now,
});
assert.ok(multiResult.hits.length >= 2);
assert.ok(multiResult.narrativeKo.includes("맥락"));
assert.ok(multiResult.narrativeKo.includes("여행"));
assert.ok(multiResult.narrativeKo.includes("출장"));
assert.ok(multiResult.recallContext);
assert.ok(multiResult.recallContext.coExperienceCount >= 2);

const shanghaiOverseas = baseEvent({
  id: "ev-sh-overseas",
  title: "정성이랑 해외여행",
  place: "상하이",
  datetime: "2025-01-05T10:00:00.000Z",
  metadata: {
    planPeerDisplayName: "정성",
    feedCaptures: [
      {
        id: "p-sh-3",
        kind: "photo",
        capturedAtIso: "2025-01-05T11:00:00.000Z",
        url: "https://example.com/shanghai-3.jpg",
        verified: true,
      },
    ],
  },
});

const shanghaiFixtures = [...events, shanghaiTrip, shanghaiOverseas];
const unifiedQueries = [
  "정성이랑 상하이 언제감?",
  "정성이랑 상하이 사진",
  "정성이랑 상하이 가서 찍은 사진좀",
  "정성이랑 상하이 여행",
  "정성이랑 상하이에서 뭐했지",
];

const unifiedIds = unifiedQueries.map((query) =>
  resolvePersonalContextAsk({
    query,
    events: shanghaiFixtures,
    scope: "personal",
    now,
  })
    .hits.map((hit) => hit.eventId)
    .sort()
    .join(","),
);

assert.ok(
  unifiedIds.every((ids) => ids === unifiedIds[0]),
  "person+place queries must share the same bridge set",
);
assert.ok(unifiedIds[0]!.includes("ev-shanghai"));

const photoOnlyQuery = resolvePersonalContextAsk({
  query: "정성이랑 상하이 사진",
  events: shanghaiFixtures,
  scope: "personal",
  now,
});
assert.equal(photoOnlyQuery.kind, "bridges");
assert.ok(photoOnlyQuery.hits.length >= 2);
assert.ok(photoOnlyQuery.narrativeKo.includes("사진"));
assert.ok(photoOnlyQuery.featuredHitId);

console.log("test-personal-context-ask: ok");
