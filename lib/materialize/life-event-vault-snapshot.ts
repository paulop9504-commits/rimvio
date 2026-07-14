import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { CONTEXT_CAPABILITY_INVOCATIONS_META_KEY } from "@/lib/marketplace/context-capability-invocation-metadata";
import { CONTEXT_INSTALLED_ENGINES_META_KEY } from "@/lib/engine/context-installed-engines-metadata";
import { CONTEXT_ENGINE_EVENTS_META_KEY } from "@/lib/engine/engine-event-metadata";
import { CONTEXT_EXECUTION_PLAN_META_KEY } from "@/lib/context-execution/context-execution-plan-metadata";

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
  CONTEXT_EXECUTION_PLAN_META_KEY,
  CONTEXT_INSTALLED_ENGINES_META_KEY,
  CONTEXT_ENGINE_EVENTS_META_KEY,
  CONTEXT_CAPABILITY_INVOCATIONS_META_KEY,
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
