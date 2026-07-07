"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Guarantee a backing anchor event for any globe cluster so the context AI can
 * connect to *every* context — not just ones already backed by a stored event
 * or personal pin (GPS dwell, media clusters, pruned contexts otherwise fail).
 */
export function materializeGlobeContextAnchorEventFromCluster(
  cluster: PinCluster | null | undefined,
): EventCandidate | null {
  const key = cluster?.eventId?.trim();
  if (!cluster || !key) {
    return null;
  }

  const existing =
    findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
  if (existing) {
    return existing;
  }

  const lat = readFiniteCoord(cluster.lat);
  const lng = readFiniteCoord(cluster.lng);
  const title = cluster.title?.trim() || cluster.placeLabel?.trim() || "맥락";
  const place = cluster.placeLabel?.trim() || undefined;
  const stamp = new Date().toISOString();

  return commitEventUpsert({
    id: key,
    title,
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: cluster.startedAtIso?.trim() || stamp,
    place,
    confidence: 0.85,
    metadata: {
      feedPlanEnabled: true,
      targetingSource: "globe_manual",
      globeManualContext: true,
      globeRecoveredFromCluster: true,
      ...(lat !== null && lng !== null
        ? {
            globePlaceConfirmed: true,
            globePlaceLat: lat,
            globePlaceLng: lng,
            globePlaceLabel: place ?? title,
          }
        : {}),
    },
    lifecycleUpdatedAt: stamp,
  });
}
