import type {
  EventCandidate,
  EventCandidateCategory,
  EventCandidateLifecycle,
} from "@/lib/events/event-candidate";
import { FEED_CAPTURES_META_KEY } from "@/lib/feed/feed-capture-types";
import { isArchiveFoldComplete } from "@/lib/events/fold-archived-event";
import { LOCKED_LIFECYCLE_ORDER } from "@/lib/event-kernel/schema-lock/mutation-rules";

export const ACTIVE_WINDOW_MS = 60 * 60 * 1000;
export const ARCHIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** Live store retention for archived rows after immutable fold. */
export const LIVE_ARCHIVED_PRUNE_MS = 48 * 60 * 60 * 1000;

/** Monotonic order — locked in schema-lock (do not reorder). */
export const LIFECYCLE_ORDER: EventCandidateLifecycle[] = [...LOCKED_LIFECYCLE_ORDER];

export function initialLifecycle(): EventCandidateLifecycle {
  return "mentioned";
}

export function lifecycleRank(state: EventCandidateLifecycle): number {
  const index = LIFECYCLE_ORDER.indexOf(state);
  return index >= 0 ? index : -1;
}

export function canAdvanceLifecycle(
  from: EventCandidateLifecycle,
  to: EventCandidateLifecycle
): boolean {
  const fromIndex = lifecycleRank(from);
  const toIndex = lifecycleRank(to);
  if (fromIndex < 0 || toIndex < 0) {
    return false;
  }
  return toIndex > fromIndex;
}

export function mergeLifecycle(
  current: EventCandidateLifecycle,
  incoming: EventCandidateLifecycle
): EventCandidateLifecycle {
  return lifecycleRank(incoming) > lifecycleRank(current) ? incoming : current;
}

export function advanceEventLifecycle(
  event: EventCandidate,
  next: EventCandidateLifecycle
): EventCandidate {
  if (!canAdvanceLifecycle(event.lifecycle, next)) {
    return event;
  }
  const nowIso = new Date().toISOString();
  return {
    ...event,
    lifecycle: next,
    lifecycleUpdatedAt: nowIso,
    updatedAt: nowIso,
  };
}

export function scoreEventConfidence(input: {
  category: EventCandidateCategory;
  datetime?: string;
  place?: string;
}): number {
  let confidence = input.category === "custom" ? 0.62 : 0.72;
  if (input.datetime) {
    confidence += 0.08;
  }
  if (input.place) {
    confidence += 0.06;
  }
  if (input.category !== "custom") {
    confidence += 0.04;
  }
  return Math.min(0.95, Math.round(confidence * 100) / 100);
}

export function isGlobeManualContextEvent(event: EventCandidate): boolean {
  const meta = event.metadata;
  return (
    meta?.globeManualContext === true ||
    meta?.targetingSource === "globe_manual" ||
    meta?.targetingSource === "globe_photo_confirm"
  );
}

function hasGlobeMediaFeedCaptures(event: EventCandidate): boolean {
  const captures = event.metadata?.[FEED_CAPTURES_META_KEY];
  if (!Array.isArray(captures)) {
    return false;
  }
  return captures.some((row) => {
    if (!row || typeof row !== "object") {
      return false;
    }
    const kind = (row as { kind?: string }).kind;
    return kind === "photo" || kind === "video";
  });
}

/** Photo/video contexts stay on the globe — not subject to 48h moment prune. */
export function isDurableGlobeContextEvent(event: EventCandidate): boolean {
  if (isGlobeManualContextEvent(event)) {
    return true;
  }
  const meta = event.metadata ?? {};
  if (meta.feedCaptureDurable === true) {
    return true;
  }
  if (meta.exifAutoPinned === true || meta.globePlaceConfirmed === true) {
    return true;
  }
  return hasGlobeMediaFeedCaptures(event);
}

export function pruneExpiredEvents(items: EventCandidate[], now = Date.now()): EventCandidate[] {
  return items.filter((item) => {
    if (isDurableGlobeContextEvent(item)) {
      return true;
    }
    if (item.lifecycle === "archived") {
      if (!isArchiveFoldComplete(item)) {
        return true;
      }
      const foldAt = new Date(String(item.metadata?.archiveFoldedAt)).getTime();
      if (Number.isNaN(foldAt)) {
        return true;
      }
      return now - foldAt <= LIVE_ARCHIVED_PRUNE_MS;
    }
    if (item.lifecycle === "completed") {
      return true;
    }
    if (!item.datetime) {
      return true;
    }
    const target = new Date(item.datetime).getTime();
    if (Number.isNaN(target)) {
      return true;
    }
    const staleCutoff = now - 48 * 60 * 60 * 1000;
    return target >= staleCutoff;
  });
}

export function minutesUntilDatetime(datetime: string | undefined, nowMs: number): number | null {
  if (!datetime) {
    return null;
  }
  const target = new Date(datetime).getTime();
  if (Number.isNaN(target)) {
    return null;
  }
  return Math.round((target - nowMs) / 60_000);
}

export function shouldPromoteToActive(
  event: EventCandidate,
  nowMs: number,
  activeWindowMs = ACTIVE_WINDOW_MS
): boolean {
  if (event.lifecycle !== "scheduled" || !event.datetime) {
    return false;
  }
  const minutes = minutesUntilDatetime(event.datetime, nowMs);
  if (minutes == null) {
    return false;
  }
  return minutes <= activeWindowMs / 60_000 && minutes >= -activeWindowMs / 60_000;
}

export function shouldPromoteToArchived(
  event: EventCandidate,
  nowMs: number,
  archiveWindowMs = ARCHIVE_WINDOW_MS
): boolean {
  if (event.lifecycle !== "completed") {
    return false;
  }
  const anchor = new Date(event.lifecycleUpdatedAt ?? event.updatedAt).getTime();
  if (Number.isNaN(anchor)) {
    return false;
  }
  return nowMs - anchor >= archiveWindowMs;
}
