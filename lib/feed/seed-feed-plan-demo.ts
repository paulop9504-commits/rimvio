import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  listEventCandidates,
  upsertEventCandidate,
} from "@/lib/events/event-store";

export const FEED_PLAN_DEMO_EVENT_ID = "rimvio-feed-plan-demo";

function roundToNextQuarterHour(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % 15;
  if (remainder !== 0) {
    next.setMinutes(next.getMinutes() + (15 - remainder));
  }
  return next;
}

function toLocalEventIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function buildFeedPlanDemoDraft(now = new Date()): EventCandidate {
  const start = roundToNextQuarterHour(new Date(now.getTime() + 75 * 60_000));
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  end.setHours(18, 0, 0, 0);

  return {
    id: FEED_PLAN_DEMO_EVENT_ID,
    title: "강남역 미팅",
    category: "schedule",
    source: "manual",
    lifecycle: "active",
    datetime: toLocalEventIso(start),
    place: "강남역",
    confidence: 0.92,
    metadata: {
      feedPlanEnabled: true,
      planKind: "plan",
      planWindowEndIso: toLocalEventIso(end),
      planNights: 2,
      planWindowConfidence: "confirmed",
      planPeerDisplayName: "민수",
      feedDemo: true,
    },
    lifecycleUpdatedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function demoNeedsRefresh(existing: EventCandidate, now: Date): boolean {
  if (!existing.datetime) {
    return true;
  }
  const startMs = Date.parse(existing.datetime);
  if (Number.isNaN(startMs)) {
    return true;
  }
  const minutesUntil = (startMs - now.getTime()) / 60_000;
  return minutesUntil < 45 || minutesUntil > 150;
}

/**
 * Dev-only feed fixture — keeps one plan-backed slot in the today queue for UX QA.
 */
export function ensureFeedPlanDemoEvent(now = new Date()): EventCandidate | null {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return null;
  }

  const existing = listEventCandidates().find((item) => item.id === FEED_PLAN_DEMO_EVENT_ID);
  if (existing && !demoNeedsRefresh(existing, now)) {
    return existing;
  }

  const draft = buildFeedPlanDemoDraft(now);
  return upsertEventCandidate({
    id: draft.id,
    title: draft.title,
    category: draft.category,
    source: draft.source,
    lifecycle: draft.lifecycle,
    datetime: draft.datetime,
    place: draft.place,
    confidence: draft.confidence,
    metadata: draft.metadata,
  });
}
