import { composeUnifiedCalendarOverlay } from "@/lib/calendar/compose-unified-calendar-overlay";
import { projectKnowledgeCalendarChips } from "@/lib/calendar/project-knowledge-calendar-chips";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import { buildMeetTimeQuestion } from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import type { AgentNegotiationRoomRecord } from "@/lib/globe/market/coordination/agent-negotiation-types";
import {
  extractCalendarBusyIntervalsFromOverlayRows,
  type CalendarBusyInterval,
} from "@/lib/globe/market/coordination/agent-negotiation-slot-chips";

/** Wire format for PATCH start/tick — small ISO snapshot. */
export type CalendarBusyIntervalWire = {
  start: string;
  end: string;
};

export function serializeCalendarBusyIntervals(
  intervals: readonly CalendarBusyInterval[],
): CalendarBusyIntervalWire[] {
  return intervals.map((interval) => ({
    start: new Date(interval.startMs).toISOString(),
    end: new Date(interval.endMs).toISOString(),
  }));
}

export function parseCalendarBusyIntervalWire(
  value: unknown,
): CalendarBusyInterval[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const intervals: CalendarBusyInterval[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const start = (row as { start?: unknown }).start;
    const end = (row as { end?: unknown }).end;
    if (typeof start !== "string" || typeof end !== "string") {
      continue;
    }
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      continue;
    }
    intervals.push({ startMs, endMs });
  }
  return intervals.sort((left, right) => left.startMs - right.startMs);
}

export function buildCalendarBusyFromKnowledgeEntities(
  entities: readonly KnowledgeEntity[],
  now = new Date(),
): CalendarBusyInterval[] {
  const knowledgeChips = projectKnowledgeCalendarChips(entities, now);
  const overlayRows = composeUnifiedCalendarOverlay([], knowledgeChips, now);
  return extractCalendarBusyIntervalsFromOverlayRows(overlayRows);
}

export function mergeCalendarBusyIntoRoom(
  room: AgentNegotiationRoomRecord,
  calendarBusyIntervals: readonly CalendarBusyInterval[] | undefined,
): AgentNegotiationRoomRecord {
  if (!calendarBusyIntervals?.length) {
    return room;
  }
  const next: AgentNegotiationRoomRecord = {
    ...room,
    calendarBusyIntervals,
  };
  return refreshCoordinationRoomMeetSlotChips(next);
}

export function refreshCoordinationRoomMeetSlotChips(
  room: AgentNegotiationRoomRecord,
): AgentNegotiationRoomRecord {
  const question = room.pendingQuestion;
  if (!question || question.slotKey !== "meet_time_label") {
    return room;
  }
  const refreshed = buildMeetTimeQuestion(question.ownerRole, {
    availabilityPreset: room.availabilityPreset,
    calendarBusyIntervals: room.calendarBusyIntervals,
    priceMinKrw: room.priceMinKrw,
    priceMaxKrw: room.priceMaxKrw,
  });
  return {
    ...room,
    pendingQuestion: {
      ...question,
      chips: refreshed.chips,
    },
  };
}
