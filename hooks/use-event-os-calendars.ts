"use client";

import { useEffect, useMemo, useState } from "react";
import { getActionProjection } from "@/lib/action-projection/action-projection-cache";
import { projectActionCalendarChips } from "@/lib/action-projection/project-action-calendar";
import type { CalendarEventChip } from "@/lib/calendar/calendar-view-types";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/events/event-store";
import {
  listEventCalendarRows,
  projectEventCalendarChips,
} from "@/lib/events/project-event-calendar";

/**
 * Subscribes to Event SSOT + recomputes Action Projection on SSOT/time changes.
 * @internal Action Calendar only — use `useActionCalendar`, not this hook directly.
 */
export function useEventOsCalendars(anchor = new Date()) {
  const [ssotTick, setSsotTick] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const onStoreUpdate = () => setSsotTick((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, onStoreUpdate);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, onStoreUpdate);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const eventChips = useMemo(() => {
    void ssotTick;
    return projectEventCalendarChips(listEventCalendarRows(), anchor);
  }, [ssotTick, anchor]);

  const actionChips = useMemo(() => {
    void ssotTick;
    const projection = getActionProjection(now);
    return projectActionCalendarChips(projection.entries, anchor);
  }, [ssotTick, now, anchor]);

  return { eventChips, actionChips, now };
}

export type EventOsCalendarSelection = {
  chip: CalendarEventChip;
};
