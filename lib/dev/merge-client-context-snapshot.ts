import { buildContextSnapshot } from "@/lib/dev/build-context-snapshot";
import { computeRecallHitRate } from "@/lib/dev/compute-recall-hit-rate";
import { detectContextAlerts } from "@/lib/dev/detect-context-alerts";
import type {
  ContextSnapshot,
  ContextSnapshotServerPayload,
} from "@/lib/dev/context-snapshot-types";
import type { ConversationMemoryWire } from "@/lib/conversation-memory/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { PeerContact } from "@/lib/context/peer-contact-types";

export type ContextOpsClientOverlay = {
  events: readonly EventCandidate[];
  contacts: readonly PeerContact[];
  conversationMemories: readonly ConversationMemoryWire[];
  localPinEventIds: readonly string[];
};

/** Browser SSOT overlay — localStorage pins/memories + life-read-model events. */
export function mergeClientContextSnapshot(
  server: ContextSnapshotServerPayload | null | undefined,
  overlay: ContextOpsClientOverlay,
): ContextSnapshot {
  const merged = buildContextSnapshot({
    events: overlay.events,
    contacts: overlay.contacts,
    conversationMemories: overlay.conversationMemories,
    localPinEventIds: overlay.localPinEventIds,
    externalPinRows: server?.externalPinRows ?? [],
    liveTurns: undefined,
  });

  if (server?.liveStream?.length) {
    merged.liveStream = server.liveStream;
  }

  if (server?.external) {
    merged.external = {
      ...merged.external,
      externalPinCount: server.external.externalPinCount,
      orphanExternalPins: [
        ...merged.external.orphanExternalPins,
        ...server.external.orphanExternalPins,
      ].filter(
        (row, index, arr) =>
          arr.findIndex((item) => item.id === row.id) === index,
      ),
      orphanExternalEvents: merged.external.orphanExternalEvents,
    };
  }

  merged.alerts = detectContextAlerts({
    internal: merged.internal,
    external: merged.external,
    liveStream: merged.liveStream,
    events: overlay.events,
    externalPinRows: server?.externalPinRows ?? [],
  });

  return merged;
}

export function countEventsCreatedToday(events: readonly EventCandidate[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return events.filter((event) => event.createdAt?.startsWith(today)).length;
}

export function buildContextOpsKpis(
  snapshot: ContextSnapshot,
  events: readonly EventCandidate[],
) {
  const recall = computeRecallHitRate({
    liveStream: snapshot.liveStream,
    conversationMemoryCount: snapshot.internal.conversationMemoryCount,
  });

  return {
    activeContextCount: snapshot.internal.eventCount,
    eventsTodayDelta: countEventsCreatedToday(events),
    recallHitRatePct: recall.hitRatePct,
    recallHitCount: recall.hitCount,
    recallUtteranceCount: recall.recallUtteranceCount,
    peopleGraphCount: snapshot.internal.peopleCount,
    contactCount: snapshot.internal.contactCount,
    discoveredPeopleCount: snapshot.internal.discoveredPeopleCount,
    externalPinCount: snapshot.external.externalPinCount,
    orphanCount:
      snapshot.external.orphanExternalPins.length +
      snapshot.external.orphanExternalEvents.length,
    dominantCluster: snapshot.internal.dominantTrajectoryCluster,
    conversationMemoryCount: snapshot.internal.conversationMemoryCount,
  };
}
