import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  ACTIVE_WINDOW_MS,
  ARCHIVE_WINDOW_MS,
  shouldPromoteToActive,
  shouldPromoteToArchived,
} from "@/lib/events/event-lifecycle";
import {
  listEventCandidates,
  transitionEventLifecycle,
} from "@/lib/events/event-store";

export type SyncEventLifecycleOptions = {
  now?: Date;
  activeWindowMs?: number;
  archiveWindowMs?: number;
};

/** Periodic sync — scheduled→active, completed→archived via store transitions only. */
export function syncEventLifecycle(options: SyncEventLifecycleOptions = {}): EventCandidate[] {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const activeWindowMs = options.activeWindowMs ?? ACTIVE_WINDOW_MS;
  const archiveWindowMs = options.archiveWindowMs ?? ARCHIVE_WINDOW_MS;

  for (const event of listEventCandidates()) {
    if (shouldPromoteToActive(event, nowMs, activeWindowMs)) {
      transitionEventLifecycle(event.id, "active");
    }
  }

  for (const event of listEventCandidates()) {
    if (shouldPromoteToArchived(event, nowMs, archiveWindowMs)) {
      transitionEventLifecycle(event.id, "archived");
    }
  }

  return listEventCandidates();
}
