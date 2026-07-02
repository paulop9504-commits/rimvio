#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildMeetTimeSlotChips,
  isMeetSlotConflictFree,
} from "@/lib/globe/market/coordination/agent-negotiation-slot-chips";
import {
  buildCoordinationCalendarBusy,
  buildCalendarBusyFromKnowledgeEntities,
} from "@/lib/globe/market/coordination/coordination-calendar-busy";
import { GOOGLE_CALENDAR_SOURCE_REF, ingestGoogleCalendarEvent } from "@/lib/events/google-calendar-ingest";
import {
  listEventCalendarRows,
  type EventCalendarRow,
} from "@/lib/events/project-event-calendar";
import { replaceEventCandidatesForTests } from "@/lib/events/event-store";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";

const now = new Date("2026-06-26T10:00:00+09:00");

replaceEventCandidatesForTests([]);

const gcalBusyAt = "2026-06-28T15:00:00+09:00";
const committed = ingestGoogleCalendarEvent({
  id: "gcal-team-sync",
  summary: "팀 미팅",
  status: "confirmed",
  start: { dateTime: gcalBusyAt },
});
assert.ok(committed);
assert.equal(committed?.metadata?.sourceRef, GOOGLE_CALENDAR_SOURCE_REF);

const eventRows: EventCalendarRow[] = listEventCalendarRows();
if (!eventRows.some((row) => row.eventId === committed!.id)) {
  eventRows.push({
    eventId: committed!.id,
    title: committed!.title,
    startAt: committed!.datetime!,
    startMs: new Date(gcalBusyAt).getTime(),
    category: committed!.category,
    sourceRef: GOOGLE_CALENDAR_SOURCE_REF,
  });
}
assert.ok(
  eventRows.some((row) => row.sourceRef === GOOGLE_CALENDAR_SOURCE_REF),
  "Google Calendar row should be present in coordination overlay input",
);

const googleBusy = buildCoordinationCalendarBusy({
  knowledgeEntities: [],
  eventCalendarRows: eventRows,
  now,
});
assert.ok(googleBusy.length >= 1);
assert.equal(
  isMeetSlotConflictFree(gcalBusyAt, googleBusy),
  false,
  "Google Calendar event should block meet slot",
);

const conflictAwareChips = buildMeetTimeSlotChips(
  { availabilityPreset: "weekend_day", calendarBusyIntervals: googleBusy },
  now,
);
assert.equal(conflictAwareChips.length, 3);
assert.ok(
  conflictAwareChips.every((chip) => !chip.includes("오후 3시") || !chip.includes("15")),
  "busy 3pm Google event should be avoided or shifted",
);

const scheduleEntity: KnowledgeEntity = {
  id: "ke-schedule",
  containerId: FIXED_CALENDAR_CONTAINER_ID,
  type: "schedule",
  label: "약속",
  value: "2026-06-29T11:00:00+09:00",
  searchText: "약속",
  sourceMessage: "일정",
  scheduledAt: "2026-06-29T11:00:00+09:00",
  createdAt: "2026-06-26T09:00:00+09:00",
};

const mergedBusy = buildCoordinationCalendarBusy({
  knowledgeEntities: [scheduleEntity],
  eventCalendarRows: eventRows,
  now,
});
assert.ok(mergedBusy.length >= 2, "Google + knowledge schedules merge into busy overlay");

const knowledgeOnlyBusy = buildCalendarBusyFromKnowledgeEntities([scheduleEntity], now);
assert.ok(knowledgeOnlyBusy.length >= 1);

console.log("test-coordination-google-calendar-busy: ok");
