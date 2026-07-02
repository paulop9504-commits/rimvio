"use client";

import { buildCalendarBusyFromKnowledgeEntities } from "@/lib/globe/market/coordination/coordination-calendar-busy";
import type { CalendarBusyInterval } from "@/lib/globe/market/coordination/agent-negotiation-slot-chips";
import { getRecentKnowledgeEntities } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";

export async function fetchCoordinationCalendarBusyIntervals(
  now = new Date(),
): Promise<CalendarBusyInterval[]> {
  const entities = await getRecentKnowledgeEntities({
    containerId: FIXED_CALENDAR_CONTAINER_ID,
    limit: 40,
  });
  return buildCalendarBusyFromKnowledgeEntities(entities, now);
}
