import type { StudyFocusTimerPayload } from "@/lib/contextual-aux/study/save-study-focus-timer";
import type { AgentNegotiationRoomRecord } from "@/lib/globe/market/coordination/agent-negotiation-types";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";

function nowIso(): string {
  return new Date().toISOString();
}

function parseStudyFocusPayload(value: string): StudyFocusTimerPayload | null {
  try {
    const parsed = JSON.parse(value) as StudyFocusTimerPayload;
    if (parsed?.mode === "count_up" && parsed.category === "study" && parsed.startedAt) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

/** Calendar-axis SSOT — active study focus timer in knowledge calendar container. */
export function hasActiveCalendarStudyFocus(
  entities: readonly KnowledgeEntity[],
  now = new Date(),
): boolean {
  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  for (const entity of entities) {
    if (entity.containerId !== FIXED_CALENDAR_CONTAINER_ID) {
      continue;
    }
    const focus = parseStudyFocusPayload(entity.value);
    if (!focus) {
      continue;
    }
    const started = new Date(focus.startedAt);
    if (!Number.isFinite(started.getTime())) {
      continue;
    }
    const entityDay = [
      started.getFullYear(),
      String(started.getMonth() + 1).padStart(2, "0"),
      String(started.getDate()).padStart(2, "0"),
    ].join("-");
    if (entityDay === todayKey) {
      return true;
    }
  }
  return false;
}

export function isFocusDeferPaused(
  room: AgentNegotiationRoomRecord,
  deferMessageKo: string,
): boolean {
  if (room.state !== "PAUSED") {
    return false;
  }
  const last = room.log.at(-1);
  return last?.type === "system" && last.text === deferMessageKo;
}

export function shouldDeferNegotiationForFocus(
  room: AgentNegotiationRoomRecord,
  focusActive: boolean,
): boolean {
  if (!focusActive) {
    return false;
  }
  return room.state === "NEGOTIATING" || room.state === "WAITING_USER_INPUT";
}

export function refreshAgentNegotiationFocusDeferState(
  room: AgentNegotiationRoomRecord,
  focusActive: boolean,
  deferMessageKo: string,
): AgentNegotiationRoomRecord {
  if (focusActive) {
    if (!shouldDeferNegotiationForFocus(room, true)) {
      return room;
    }
    if (isFocusDeferPaused(room, deferMessageKo)) {
      return room;
    }
    if (room.state === "PAUSED") {
      return room;
    }
    return {
      ...room,
      state: "PAUSED",
      updatedAtIso: nowIso(),
      log: [
        ...room.log,
        {
          type: "system",
          text: deferMessageKo,
          atIso: nowIso(),
        },
      ],
    };
  }

  if (!isFocusDeferPaused(room, deferMessageKo)) {
    return room;
  }

  return {
    ...room,
    state: room.pendingQuestion ? "WAITING_USER_INPUT" : "NEGOTIATING",
    updatedAtIso: nowIso(),
  };
}
