"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { updateExperienceBridgePinnedItemRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";

/** Shared context pin — persist resource choice onto bridge snapshot. */
export async function publishBridgePinnedContextItem(
  event: EventCandidate,
): Promise<boolean> {
  if (!isBridgeLinkedEventId(event.id)) {
    return false;
  }
  await updateExperienceBridgePinnedItemRemote({ event });
  return true;
}
