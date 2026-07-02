"use client";

import { listBridgeLinkedEventIds } from "@/lib/experience-bridge/list-bridge-linked-event-ids";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { syncBridgeSharedMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";
import { shouldSkipGlobeFetch } from "@/lib/globe/globe-fetch-min-interval";

const MAX_EVENTS_PER_SYNC = 8;
const PER_EVENT_MIN_MS = 90_000;

async function collectBridgeEventIds(
  priorityEventId?: string | null,
): Promise<string[]> {
  const ids = new Set(listBridgeLinkedEventIds());
  const priority = priorityEventId?.trim() ?? "";
  const all = [...ids].filter(Boolean);
  if (!priority) {
    return all;
  }
  return [priority, ...all.filter((id) => id !== priority)];
}

/** Pull friend/host media for linked bridge events. Returns merge count. */
export async function syncAllBridgeSharedMedia(input?: {
  viewerUserId?: string | null;
  priorityEventId?: string | null;
}): Promise<number> {
  const ids = await collectBridgeEventIds(input?.priorityEventId);
  if (ids.length === 0) {
    return 0;
  }

  let changed = 0;
  let budget = MAX_EVENTS_PER_SYNC;

  for (const eventId of ids) {
    if (budget <= 0) {
      break;
    }
    if (shouldSkipGlobeFetch(`bridge:media:${eventId}`, PER_EVENT_MIN_MS)) {
      continue;
    }
    budget -= 1;

    const merged = await syncBridgeSharedMediaFromRemote(
      eventId,
      input?.viewerUserId ?? null,
    );
    if (merged) {
      changed += 1;
    }
  }

  if (changed > 0) {
    notifyBridgeSharedMediaUpdated();
  }

  return changed;
}
