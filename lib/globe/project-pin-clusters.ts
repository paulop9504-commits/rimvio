import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { projectLatLngToMapPercent } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import type { PinCluster, PinClusterEvidence } from "@/lib/globe/pin-cluster-types";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { listPersonalGlobePins } from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { globeViewForSharedPins } from "@/lib/peer-chat/globe-view-for-shared-pins";

function evidenceFromEvent(event: EventCandidate | null | undefined): PinClusterEvidence {
  const { photoCount, videoCount } = countEventMedia(event);
  const captures = readFeedCaptureFragments(event);
  const chatCount = captures.filter(
    (row) => row.kind === "memo" || row.kind === "link",
  ).length;
  const placePinCount =
    captures.filter((row) => row.kind === "gps_dwell").length +
    (event?.place?.trim() ? 1 : 0);
  return { photoCount, videoCount, chatCount, placePinCount };
}

function clusterFromVolume(input: {
  volume: ExperienceVolume;
  event: EventCandidate | null | undefined;
}): PinCluster {
  const event = input.event;
  const coords = event
    ? resolveEventGlobeCoords(event)
    : {
        lat: 37.5665,
        lng: 126.978,
        placeLabel: input.volume.space.label,
      };
  const startedAtIso =
    input.volume.time.startIso?.trim() || event?.datetime?.trim() || null;

  return {
    pinId: `pcluster:${input.volume.sourceEventId}`,
    eventId: input.volume.sourceEventId,
    title: input.volume.title.trim() || event?.title.trim() || "경험",
    placeLabel: coords.placeLabel,
    lat: coords.lat,
    lng: coords.lng,
    dateLabel: formatPinDateLabel(startedAtIso),
    startedAtIso,
    evidence: evidenceFromEvent(event),
    recallLine: null,
  };
}

function clusterFromPersonalPin(
  pin: ReturnType<typeof listPersonalGlobePins>[number],
  event: EventCandidate | null | undefined,
): PinCluster {
  const evidence = evidenceFromEvent(event);
  return {
    pinId: pin.pinId,
    eventId: pin.eventId,
    title: pin.experienceTitle,
    placeLabel: pin.placeLabel,
    lat: pin.lat,
    lng: pin.lng,
    dateLabel: formatPinDateLabel(pin.createdAtIso),
    startedAtIso: pin.createdAtIso,
    evidence: {
      photoCount: Math.max(evidence.photoCount, pin.photoCount),
      videoCount: Math.max(evidence.videoCount, pin.videoCount),
      chatCount: evidence.chatCount,
      placePinCount: evidence.placePinCount,
    },
    recallLine: null,
  };
}

/** EventCandidate volumes → one pin per experience (Pin Cluster). */
export function projectPinClustersFromGraph(input: {
  volumes: readonly ExperienceVolume[];
  eventsById: ReadonlyMap<string, EventCandidate>;
}): PinCluster[] {
  const byEventId = new Map<string, PinCluster>();

  for (const volume of input.volumes) {
    const event = input.eventsById.get(volume.sourceEventId) ?? null;
    byEventId.set(volume.sourceEventId, clusterFromVolume({ volume, event }));
  }

  for (const pin of listPersonalGlobePins()) {
    if (byEventId.has(pin.eventId)) {
      const existing = byEventId.get(pin.eventId)!;
      byEventId.set(
        pin.eventId,
        clusterFromPersonalPin(pin, input.eventsById.get(pin.eventId) ?? null),
      );
      if (!existing.dateLabel && byEventId.get(pin.eventId)!.dateLabel) {
        // keep merged cluster
      }
      continue;
    }
    byEventId.set(
      pin.eventId,
      clusterFromPersonalPin(pin, input.eventsById.get(pin.eventId) ?? null),
    );
  }

  return Array.from(byEventId.values()).sort((left, right) => {
    const leftMs = left.startedAtIso ? Date.parse(left.startedAtIso) : 0;
    const rightMs = right.startedAtIso ? Date.parse(right.startedAtIso) : 0;
    return rightMs - leftMs;
  });
}

function pinKindFromEvidence(evidence: PinClusterEvidence): ClassifiedGlobePin["kind"] {
  if (evidence.videoCount > 0 && evidence.photoCount === 0) {
    return "video";
  }
  if (evidence.photoCount > 0) {
    return "photo";
  }
  return "place";
}

export function projectPinClusterClassifiedPin(cluster: PinCluster): ClassifiedGlobePin {
  const map = projectLatLngToMapPercent(cluster.lat, cluster.lng);
  return {
    id: cluster.pinId,
    kind: pinKindFromEvidence(cluster.evidence),
    label: cluster.title,
    lat: cluster.lat,
    lng: cluster.lng,
    pinX: map.x,
    pinY: map.y,
    sourceEventId: cluster.eventId,
    emphasis: "primary",
    pinShape: "slot",
    slot: {
      experienceTitle: cluster.title,
      photoCount: cluster.evidence.photoCount,
      videoCount: cluster.evidence.videoCount,
    },
  };
}

export function projectPinClusterClassifiedPins(
  clusters: readonly PinCluster[],
): ClassifiedGlobePin[] {
  return clusters.map(projectPinClusterClassifiedPin);
}

export function globeViewForPinClusters(
  clusters: readonly PinCluster[],
): SpatialGlobeView {
  const classified = projectPinClusterClassifiedPins(clusters);
  if (classified.length === 0) {
    return globeViewForSharedPins([]);
  }
  const view = globeViewForSharedPins(classified);
  if (clusters.length > 1) {
    return {
      ...view,
      zoom: 0.95,
      placeLabel: `내 지구 · 핀 ${clusters.length}개`,
    };
  }
  return {
    ...view,
    zoom: 1.08,
    placeLabel: clusters[0]!.placeLabel,
  };
}

export function findPinClusterByEventId(
  clusters: readonly PinCluster[],
  eventId: string | null | undefined,
): PinCluster | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }
  return clusters.find((row) => row.eventId === key) ?? null;
}

export function findPinClusterByPinId(
  clusters: readonly PinCluster[],
  pinId: string | null | undefined,
): PinCluster | null {
  const key = pinId?.trim();
  if (!key) {
    return null;
  }
  return clusters.find((row) => row.pinId === key) ?? null;
}
