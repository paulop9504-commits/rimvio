"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { listEventCandidates } from "@/lib/events/event-store";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import {
  appendFeedCaptureFragment,
  readFeedCaptureFragments,
} from "@/lib/feed/feed-capture-metadata";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";
import {
  hasIngestedGpsDwellCluster,
  markGpsDwellClusterIngested,
} from "@/lib/feed/gps-dwell-ingest-store";
import type { GpsDwellCluster } from "@/lib/location-ping/gps-dwell-cluster-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

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

function buildGpsDwellEventDraft(cluster: GpsDwellCluster): EventCandidate {
  const startMs = Date.parse(cluster.startIso);
  const start = Number.isNaN(startMs) ? new Date() : new Date(startMs);
  const stamp = new Date().toISOString();
  const place = cluster.placeLabel.trim();
  const title = place.includes("°")
    ? `${formatDwellMinutesLabel(cluster.dwellMinutes)}`
    : `${place} · ${formatDwellMinutesLabel(cluster.dwellMinutes)}`;

  return {
    id: `event:${cluster.id}`,
    title,
    category: place.includes("°") ? "schedule" : "travel",
    source: "system",
    lifecycle: "active",
    datetime: toLocalEventIso(start),
    place: place.includes("°") ? undefined : place,
    confidence: 0.68,
    metadata: {
      autoIngested: true,
      feedPlanEnabled: false,
      targetingSource: "gps_background",
      gpsDwellMinutes: cluster.dwellMinutes,
      gpsDwellPingCount: cluster.pingCount,
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function buildGpsDwellFragment(cluster: GpsDwellCluster): FeedCaptureFragment {
  return {
    id: cluster.id,
    kind: "gps_dwell",
    capturedAtIso: cluster.startIso,
    placeLabel: cluster.placeLabel,
    label: formatDwellMinutesLabel(cluster.dwellMinutes),
    dwellMinutes: cluster.dwellMinutes,
    autoAttached: true,
    verified: false,
  };
}

function clusterAlreadyOnEvent(event: EventCandidate, clusterId: string): boolean {
  return readFeedCaptureFragments(event).some((fragment) => fragment.id === clusterId);
}

function commitGpsDwellToEvent(input: {
  target: EventCandidate;
  cluster: GpsDwellCluster;
  match: ReturnType<typeof resolveSpacetimeFeedTarget>;
  createdNewEvent: boolean;
}): EventCandidate {
  const fragment = buildGpsDwellFragment(input.cluster);
  const metadata = {
    ...appendFeedCaptureFragment(input.target.metadata, fragment),
    feedCapturePendingVerify: true,
    targetingSource: input.createdNewEvent ? "gps_background" : input.target.metadata?.targetingSource,
    gpsDwellMinutes: Math.max(
      typeof input.target.metadata?.gpsDwellMinutes === "number"
        ? input.target.metadata.gpsDwellMinutes
        : 0,
      input.cluster.dwellMinutes,
    ),
  };

  return commitEventUpsert({
    id: input.target.id,
    title: input.target.title,
    category: input.target.category,
    source: input.target.source,
    lifecycle: input.target.lifecycle,
    datetime: input.target.datetime,
    place: input.target.place ?? (input.cluster.placeLabel.includes("°") ? undefined : input.cluster.placeLabel),
    containerId: input.target.containerId,
    confidence: Math.min(0.94, input.target.confidence + (input.match ? 0.04 : 0)),
    metadata,
    lifecycleUpdatedAt: input.target.lifecycleUpdatedAt,
  });
}

export type GpsDwellIngestResult = {
  ingested: boolean;
  event: EventCandidate | null;
  cluster: GpsDwellCluster;
  createdNewEvent: boolean;
};

/** Background write — GPS dwell cluster → Feed Event (no photo required). */
export function ingestGpsDwellCluster(cluster: GpsDwellCluster): GpsDwellIngestResult {
  if (hasIngestedGpsDwellCluster(cluster.id)) {
    return { ingested: false, event: null, cluster, createdNewEvent: false };
  }

  const events = listEventCandidates();
  for (const event of events) {
    if (clusterAlreadyOnEvent(event, cluster.id)) {
      markGpsDwellClusterIngested({ clusterId: cluster.id, eventId: event.id });
      return { ingested: false, event, cluster, createdNewEvent: false };
    }
  }

  const match = resolveSpacetimeFeedTarget({
    capturedAtIso: cluster.startIso,
    lat: cluster.lat,
    lng: cluster.lng,
    placeLabel: cluster.placeLabel,
    events,
  });

  let target: EventCandidate;
  let createdNewEvent = false;

  if (match) {
    const existing = events.find((event) => event.id === match.eventId);
    if (existing) {
      target = existing;
    } else {
      target = buildGpsDwellEventDraft(cluster);
      createdNewEvent = true;
    }
  } else {
    target = buildGpsDwellEventDraft(cluster);
    createdNewEvent = true;
  }

  const saved = commitGpsDwellToEvent({
    target,
    cluster,
    match,
    createdNewEvent,
  });

  markGpsDwellClusterIngested({ clusterId: cluster.id, eventId: saved.id });

  return {
    ingested: true,
    event: saved,
    cluster,
    createdNewEvent,
  };
}

export function ingestGpsDwellClusters(
  clusters: readonly GpsDwellCluster[],
): GpsDwellIngestResult[] {
  return clusters
    .map((cluster) => ingestGpsDwellCluster(cluster))
    .filter((result) => result.ingested);
}
