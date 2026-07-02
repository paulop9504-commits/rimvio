#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { createAgentNegotiationRoom } from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import { AGENT_NEGOTIATION_FOCUS_DEFER_MESSAGE_KO } from "@/lib/globe/market/coordination/agent-coordination-focus-copy";
import {
  buildCalendarBusyFromKnowledgeEntities,
  mergeCalendarBusyIntoRoom,
  parseCalendarBusyIntervalWire,
  serializeCalendarBusyIntervals,
} from "@/lib/globe/market/coordination/coordination-calendar-busy";
import {
  hasActiveCalendarStudyFocus,
  isFocusDeferPaused,
  refreshAgentNegotiationFocusDeferState,
} from "@/lib/globe/market/coordination/read-user-focus-defer";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";

const now = new Date("2026-06-26T10:00:00+09:00");

const studyEntity: KnowledgeEntity = {
  id: "ke-study-focus",
  containerId: FIXED_CALENDAR_CONTAINER_ID,
  type: "schedule",
  label: "공부 · 09:00 시작",
  value: JSON.stringify({
    mode: "count_up",
    category: "study",
    startedAt: "2026-06-26T09:00:00+09:00",
    label: "공부 · 09:00 시작",
  }),
  searchText: "공부 집중",
  sourceMessage: "집중 공부 타이머",
  scheduledAt: "2026-06-26T09:00:00+09:00",
  createdAt: "2026-06-26T09:00:00+09:00",
};

assert.equal(hasActiveCalendarStudyFocus([studyEntity], now), true);

const busy = buildCalendarBusyFromKnowledgeEntities([studyEntity], now);
assert.ok(busy.length >= 1);

const wire = serializeCalendarBusyIntervals(busy);
assert.equal(wire[0]?.start, new Date(busy[0]!.startMs).toISOString());
assert.equal(parseCalendarBusyIntervalWire(wire).length, wire.length);

const negotiating = createAgentNegotiationRoom({
  handshakeId: "hs-focus",
  threadId: null,
  productTitle: "아이폰",
  priceLine: "800,000원",
  peerDisplayName: "민수",
  viewerRole: "seeking",
});

const paused = refreshAgentNegotiationFocusDeferState(
  negotiating,
  true,
  AGENT_NEGOTIATION_FOCUS_DEFER_MESSAGE_KO,
);
assert.equal(paused.state, "PAUSED");
assert.ok(isFocusDeferPaused(paused, AGENT_NEGOTIATION_FOCUS_DEFER_MESSAGE_KO));

const resumed = refreshAgentNegotiationFocusDeferState(
  paused,
  false,
  AGENT_NEGOTIATION_FOCUS_DEFER_MESSAGE_KO,
);
assert.equal(resumed.state, "NEGOTIATING");

const withBusy = mergeCalendarBusyIntoRoom(negotiating, busy);
assert.ok(withBusy.calendarBusyIntervals?.length);

console.log("test-agent-coordination-focus-defer: ok");
