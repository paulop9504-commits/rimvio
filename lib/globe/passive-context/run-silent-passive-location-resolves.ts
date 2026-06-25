"use client";

import { verifyFeedCaptureEvent } from "@/lib/feed/verify-feed-capture";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";
import { globeContextHasConfirmedPlace } from "@/lib/globe/apply-globe-context-place-coords";
import { markGlobeLocationConfirmed } from "@/lib/globe/globe-location-confirm-store";
import {
  listPendingGlobeLocationConfirms,
  type PendingGlobeLocationConfirm,
} from "@/lib/globe/list-pending-globe-location-confirms";
import { resolveParentTravelContextEventId } from "@/lib/globe/passive-context/resolve-parent-travel-context";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readDismissedLocationEventIds } from "@/lib/ontology";

function resolvePlaceLabel(row: PendingGlobeLocationConfirm): string {
  return row.place.trim() || "이 위치";
}

function shouldSilentlyResolve(eventId: string): boolean {
  const event = findLifeEventCandidate(eventId);
  if (!event || !hasPendingFeedCaptureVerify(event)) {
    return false;
  }

  if (resolveParentTravelContextEventId(event)) {
    return true;
  }

  if (globeContextHasConfirmedPlace(event)) {
    return true;
  }

  const meta = event.metadata ?? {};
  if (
    meta.targetingSource === "gps_background" &&
    typeof meta.gpsDwellLat === "number" &&
    typeof meta.gpsDwellLng === "number"
  ) {
    const parentId = meta.containerId?.trim();
    if (parentId && findLifeEventCandidate(parentId)) {
      return true;
    }
  }

  return false;
}

/** Phase A — attach/seal without surfacing a daily prompt. */
export function runSilentPassiveLocationResolves(input?: {
  gpsEnabled?: boolean;
}): number {
  const pending = listPendingGlobeLocationConfirms({
    dismissedIds: readDismissedLocationEventIds(),
    gpsEnabled: input?.gpsEnabled,
  });

  let resolved = 0;
  for (const row of pending) {
    if (!shouldSilentlyResolve(row.eventId)) {
      continue;
    }
    const result = verifyFeedCaptureEvent(row.eventId);
    if (!result.ok || !result.event) {
      continue;
    }
    markGlobeLocationConfirmed(resolvePlaceLabel(row), result.event.datetime);
    syncPersonalGlobePinFromEvent(result.event.id);
    resolved += 1;
  }
  return resolved;
}
