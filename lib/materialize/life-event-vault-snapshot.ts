import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";

/** Encrypted vault mirror — EventCandidate SSOT remains authoritative on device. */
export type LifeEventVaultSnapshot = {
  eventId: string;
  title: string;
  category: EventCandidate["category"];
  source: EventCandidate["source"];
  lifecycle: EventCandidate["lifecycle"];
  datetime?: string;
  place?: string;
  containerId?: string;
  confidence: number;
  lifecycleUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  captureCount: number;
  captureIds: string[];
  syncedAtIso: string;
  metadata?: Record<string, unknown>;
};

const METADATA_ALLOWLIST = new Set([
  "feedCaptures",
  "semanticMainHint",
  "bridgeEventId",
  "experienceBridge",
  "archiveFoldPending",
  "sourceMessageId",
  "sourceRef",
]);

function pickMirrorMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }
  const picked: Record<string, unknown> = {};
  for (const key of METADATA_ALLOWLIST) {
    if (metadata[key] !== undefined) {
      picked[key] = metadata[key];
    }
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

export function buildLifeEventVaultSnapshot(
  event: EventCandidate,
): LifeEventVaultSnapshot {
  const captures = readFeedCaptureFragments(event);
  const metadata = pickMirrorMetadata(event.metadata);
  return {
    eventId: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    captureCount: captures.length,
    captureIds: captures.map((row) => row.id),
    syncedAtIso: new Date().toISOString(),
    ...(metadata ? { metadata } : {}),
  };
}
