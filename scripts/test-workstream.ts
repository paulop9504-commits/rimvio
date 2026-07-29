/**
 * ADR-036 workstream — search ephemeral, selection persists, Untitled → named.
 * Run: npx tsx scripts/test-workstream.ts
 */

import assert from "node:assert/strict";
import {
  inferWorkstreamTitle,
  isEphemeralWorkUtterance,
  isScratchWorkstreamTitle,
  WORK_BECOMES_CONTEXT_SLOGAN,
  WORKSTREAM_UNTITLED,
  type WorkstreamEvent,
} from "@/lib/workstream";

assert.ok(WORK_BECOMES_CONTEXT_SLOGAN.includes("work become the context"));

assert.equal(isEphemeralWorkUtterance("숙소 찾아줘"), true);
assert.equal(isEphemeralWorkUtterance("맛집도"), true);
assert.equal(isEphemeralWorkUtterance("렌터카"), true);
assert.equal(isEphemeralWorkUtterance("호텔 예약해줘"), false);

assert.equal(isScratchWorkstreamTitle(WORKSTREAM_UNTITLED), true);
assert.equal(isScratchWorkstreamTitle("제주 4박5일 여행"), false);

{
  const events: WorkstreamEvent[] = [
    {
      id: "1",
      kind: "HotelSelected",
      atIso: "2026-07-30T10:10:00.000Z",
      contextEventId: "ctx",
      labelKo: "시부야 호텔",
      payload: { placeLabel: "도쿄" },
    },
  ];
  assert.equal(
    inferWorkstreamTitle({ events, currentTitle: WORKSTREAM_UNTITLED }),
    WORKSTREAM_UNTITLED,
    "single hotel select stays Untitled until stronger residue",
  );
}

{
  const events: WorkstreamEvent[] = [
    {
      id: "1",
      kind: "HotelSelected",
      atIso: "2026-07-30T10:10:00.000Z",
      contextEventId: "ctx",
      labelKo: "시부야 호텔",
      payload: { placeLabel: "제주" },
    },
    {
      id: "2",
      kind: "ScheduleUpdated",
      atIso: "2026-07-30T10:21:00.000Z",
      contextEventId: "ctx",
      labelKo: "4박5일",
      payload: { nights: 4, days: 5, placeLabel: "제주" },
    },
  ];
  assert.equal(
    inferWorkstreamTitle({
      events,
      currentTitle: WORKSTREAM_UNTITLED,
      placeLabel: "제주",
    }),
    "제주 4박5일 여행",
  );
}

{
  const events: WorkstreamEvent[] = [
    {
      id: "1",
      kind: "BudgetUpdated",
      atIso: "2026-07-30T10:00:00.000Z",
      contextEventId: "ctx",
      labelKo: "서류",
    },
    {
      id: "2",
      kind: "ScheduleUpdated",
      atIso: "2026-07-30T10:05:00.000Z",
      contextEventId: "ctx",
      labelKo: "건강검진",
    },
    {
      id: "3",
      kind: "HotelSelected",
      atIso: "2026-07-30T10:08:00.000Z",
      contextEventId: "ctx",
      labelKo: "연봉",
    },
  ];
  // Mixed labels trigger job heuristic via labelKo blob when travel kinds present
  // HotelSelected forces travel domain — use job-only kinds for job title:
  const jobEvents: WorkstreamEvent[] = [
    {
      id: "a",
      kind: "BudgetUpdated",
      atIso: "2026-07-30T10:00:00.000Z",
      contextEventId: "ctx",
      labelKo: "입사 서류",
    },
    {
      id: "b",
      kind: "ScheduleUpdated",
      atIso: "2026-07-30T10:05:00.000Z",
      contextEventId: "ctx",
      labelKo: "건강검진",
    },
  ];
  assert.equal(
    inferWorkstreamTitle({
      events: jobEvents,
      currentTitle: WORKSTREAM_UNTITLED,
      placeLabel: "하이텍팜",
    }),
    "하이텍팜 입사 준비",
  );
  void events;
}

console.log("OK — workstream");
