"use client";

import { listGlobeContextTimeline } from "@/lib/globe/list-globe-context-timeline";
import { isExternalPinCluster } from "@/lib/globe/merge-globe-pin-clusters";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { resolveGlobeContextPinCluster } from "@/lib/globe/resolve-globe-context-pin-cluster";
import { listLifeEventCandidates } from "@/lib/life-read-model";

const DEFAULT_LIMIT = 14;

function isConnectableContextCluster(cluster: PinCluster): boolean {
  if (isExternalPinCluster(cluster)) {
    return false;
  }
  if (cluster.variant === "bridge_ghost") {
    return false;
  }
  return Boolean(cluster.eventId?.trim());
}

/** Recent personal contexts that can bind the map/sidebar context assistant. */
export function listConnectableGlobeContextPinClusters(
  options?: { limit?: number },
): PinCluster[] {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const timeline = listGlobeContextTimeline(listLifeEventCandidates());
  const entries = [...timeline.present, ...timeline.future, ...timeline.past].sort(
    (left, right) => right.sortMs - left.sortMs,
  );

  const clusters: PinCluster[] = [];
  for (const entry of entries) {
    if (clusters.length >= limit) {
      break;
    }
    const cluster = resolveGlobeContextPinCluster(entry.eventId);
    if (!cluster || !isConnectableContextCluster(cluster)) {
      continue;
    }
    clusters.push(cluster);
  }
  return clusters;
}
