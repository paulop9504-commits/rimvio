#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildMeetTimeQuestion,
  buildPriceQuestion,
} from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import {
  buildMeetTimeSlotChips,
  buildPriceSlotChips,
  extractCalendarBusyIntervalsFromOverlayRows,
  formatAgentNegotiationMeetTimeChipKo,
  isMeetSlotConflictFree,
} from "@/lib/globe/market/coordination/agent-negotiation-slot-chips";
import { buildCalendarBusyFromKnowledgeEntities } from "@/lib/globe/market/coordination/coordination-calendar-busy";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";

const now = new Date("2026-06-26T10:00:00+09:00");

const weekendChips = buildMeetTimeSlotChips(
  { availabilityPreset: "weekend_day" },
  now,
);
assert.equal(weekendChips.length, 3);
assert.ok(weekendChips.every((chip) => chip.includes("요일") || chip.includes("토") || chip.includes("일")));

const busyAt = new Date("2026-06-28T15:00:00+09:00").getTime();
const busyRows: UnifiedCalendarOverlayRow[] = [
  {
    id: "busy-1",
    event: {
      id: "busy-1",
      layer: "event",
      eventId: "ec-busy",
      entry: null,
      title: "약속",
      dateKey: "2026-06-28",
      startMs: busyAt,
      hour: 15,
      minute: 0,
      tone: "teal",
      hasTime: true,
    },
    overlayActions: [],
  },
];
const busyIntervals = extractCalendarBusyIntervalsFromOverlayRows(busyRows);
assert.equal(busyIntervals.length, 1);
assert.equal(
  isMeetSlotConflictFree(new Date(busyAt).toISOString(), busyIntervals),
  false,
);

const conflictAwareChips = buildMeetTimeSlotChips(
  {
    availabilityPreset: "weekend_day",
    calendarBusyIntervals: busyIntervals,
  },
  now,
);
assert.equal(conflictAwareChips.length, 3);
assert.ok(
  conflictAwareChips.every((chip) => !chip.includes("오후 3시") || !chip.includes("15")),
  "busy 3pm slot should be avoided or shifted",
);

const meetQuestion = buildMeetTimeQuestion("seeking", {
  availabilityPreset: "weekday_afternoon",
});
assert.equal(meetQuestion.slotKey, "meet_time_label");
assert.equal(meetQuestion.chips?.length, 3);

const priceQuestion = buildPriceQuestion("seeking", 800_000, {
  priceMinKrw: 700_000,
  priceMaxKrw: 800_000,
});
assert.ok(priceQuestion.chips?.some((chip) => chip.includes("800,000")));
assert.ok(priceQuestion.chips?.some((chip) => chip.includes("700,000")));

const listingPriceChips = buildPriceSlotChips("listing", 1_000_000, {
  priceMinKrw: 950_000,
});
assert.ok(listingPriceChips[0]?.includes("807,500") || listingPriceChips[0]?.includes("807"));

const label = formatAgentNegotiationMeetTimeChipKo(
  new Date("2026-06-27T15:30:00+09:00").toISOString(),
  now,
);
assert.match(label, /내일/u);
assert.match(label, /3:30/u);

const scheduleEntity: KnowledgeEntity = {
  id: "ke-schedule",
  containerId: FIXED_CALENDAR_CONTAINER_ID,
  type: "schedule",
  label: "약속",
  value: "2026-06-28T15:00:00+09:00",
  searchText: "약속",
  sourceMessage: "일정",
  scheduledAt: "2026-06-28T15:00:00+09:00",
  createdAt: "2026-06-26T09:00:00+09:00",
};
const knowledgeBusy = buildCalendarBusyFromKnowledgeEntities([scheduleEntity], now);
assert.ok(knowledgeBusy.length >= 1);
const knowledgeAwareChips = buildMeetTimeSlotChips(
  { availabilityPreset: "weekend_day", calendarBusyIntervals: knowledgeBusy },
  now,
);
assert.equal(knowledgeAwareChips.length, 3);

console.log("test-agent-coordination-slot-chips: ok");
