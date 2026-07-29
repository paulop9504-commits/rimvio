/**
 * ADR-038 Context Work Manager — Work State + continue ≠ chat history.
 * Run: npx tsx scripts/test-context-work-manager.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildContextWorkState,
  isContinueWorkUtterance,
  type WorkstreamState,
} from "@/lib/workstream";

assert.equal(isContinueWorkUtterance("계속해"), true);
assert.equal(isContinueWorkUtterance("계속 진행"), true);
assert.equal(isContinueWorkUtterance("이어서"), true);
assert.equal(isContinueWorkUtterance("숙소 찾아줘"), false);

const event = {
  id: "ctx-osaka-work",
  title: "오사카 여행",
  place: "오사카",
  category: "travel",
  source: "message",
  lifecycle: "active",
  confidence: 0.9,
  metadata: {
    globePlaceLabel: "오사카",
    travelDestination: "오사카",
  },
  lifecycleUpdatedAt: "2026-07-30T00:00:00.000Z",
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-07-30T00:00:00.000Z",
} as EventCandidate;

const workstream: WorkstreamState = {
  contextEventId: "ctx-osaka-work",
  title: "오사카 여행",
  phase: "named",
  updatedAtIso: "2026-07-30T00:00:00.000Z",
  events: [
    {
      id: "1",
      kind: "ScheduleUpdated",
      atIso: "2026-07-30T00:00:00.000Z",
      contextEventId: "ctx-osaka-work",
      labelKo: "4박5일",
      payload: { nights: 4, days: 5, placeLabel: "오사카" },
    },
  ],
};

const work = buildContextWorkState({
  contextEventId: "ctx-osaka-work",
  event,
  workstream,
});

assert.equal(work.title, "오사카 여행");
assert.ok(work.completed.includes("destination"));
assert.ok(work.completed.includes("dates"));
assert.ok(work.pending.includes("lodging"));
assert.equal(work.inProgress, "lodging");
assert.ok(work.percent > 0 && work.percent < 100);
assert.equal(work.nextActions[0]?.enqueueUtterance, "숙소 찾아줘");
assert.equal(work.status, "building");

const afterHotel = buildContextWorkState({
  contextEventId: "ctx-osaka-work",
  event,
  workstream: {
    ...workstream,
    events: [
      ...workstream.events,
      {
        id: "2",
        kind: "HotelSelected",
        atIso: "2026-07-30T01:00:00.000Z",
        contextEventId: "ctx-osaka-work",
        labelKo: "난바 호텔",
      },
    ],
  },
});

assert.ok(afterHotel.completed.includes("lodging"));
assert.ok(!afterHotel.pending.includes("lodging"));
assert.ok(afterHotel.nextActions[0]?.id !== "search_hotel");

console.log("OK — context-work-manager");
