import type { EventCandidate } from "@/lib/events/event-candidate";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import type { ConversationMemoryWire } from "@/lib/conversation-memory/types";
import type { LiveTurnLogEntry } from "@/lib/self-learning/live-turn-types";
import { buildPeopleGraph } from "@/lib/people-graph/build-people-graph";
import { GLOBE_CONTEXT_VISIBILITY_EXTERNAL } from "@/lib/globe/globe-context-visibility";
import { buildContextGraph } from "@/lib/dev/build-context-graph";
import { detectContextAlerts } from "@/lib/dev/detect-context-alerts";
import type {
  ContextLiveStreamRow,
  ContextOrphanRow,
  ContextSnapshot,
  ContextSnapshotExternalKpi,
  ContextSnapshotInternalKpi,
} from "@/lib/dev/context-snapshot-types";
import { readSaveTrajectory } from "@/lib/intent/save-trajectory-client";
import { collectBehaviorSignals } from "@/lib/intent/collect-behavior-signals";

function isGlobeContextExternal(event: EventCandidate): boolean {
  return event.metadata?.globeContextVisibility === GLOBE_CONTEXT_VISIBILITY_EXTERNAL;
}

function countBy<T extends string>(
  items: readonly { [K in T]?: unknown }[],
  key: T,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const value = String(item[key] ?? "unknown");
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

function buildLiveStreamRows(entries: LiveTurnLogEntry[]): ContextLiveStreamRow[] {
  const outputs = entries.filter((row) => row.stage === "output");
  return outputs.slice(0, 40).map((row, index) => {
    const metadata = (row as LiveTurnLogEntry & { metadata?: Record<string, unknown> })
      .metadata;
    const traceRaw = metadata?.orchestratorTrace;
    const orchestratorTrace = Array.isArray(traceRaw)
      ? traceRaw.filter((line): line is string => typeof line === "string")
      : [];

    const routing = row.routing;
    const eventKernel = routing
      ? [
          routing.ai_intent,
          routing.semantic_reason,
          routing.abstraction_level,
        ]
          .filter(Boolean)
          .join(" · ") || null
      : null;

    const unifiedContext =
      typeof metadata?.unified_context_summary === "string"
        ? metadata.unified_context_summary
        : orchestratorTrace.find((line) => line.includes("UnifiedContext")) ?? null;

    const pipeline =
      orchestratorTrace.find((line) => line.startsWith("source=")) ??
      orchestratorTrace[orchestratorTrace.length - 1] ??
      null;

    return {
      id: row.messageId ?? `turn-${index}-${row.timestamp}`,
      timestamp: row.timestamp,
      userMessage: row.userMessage,
      assistantSummary: row.assistantSummary ?? null,
      routing: row.routing,
      orchestratorTrace,
      lineage: {
        eventKernel,
        unifiedContext,
        pipeline,
      },
    };
  });
}

function buildExternalKpi(input: {
  events: readonly EventCandidate[];
  externalPinRows: Array<{ event_id: string; visibility: "private" | "external" }>;
  localPinEventIds: ReadonlySet<string>;
}): ContextSnapshotExternalKpi {
  const eventIds = new Set(input.events.map((event) => event.id));
  const externalPinRows = input.externalPinRows.filter(
    (row) => row.visibility === "external",
  );
  const privatePinRows = input.externalPinRows.filter(
    (row) => row.visibility !== "external",
  );

  const orphanExternalPins: ContextOrphanRow[] = externalPinRows
    .filter((row) => !eventIds.has(row.event_id))
    .map((row) => ({
      id: row.event_id,
      kind: "external_pin",
      label: row.event_id,
      reason: "external pin without EventCandidate SSOT",
    }));

  const externalPinEventIds = new Set(externalPinRows.map((row) => row.event_id));
  const orphanExternalEvents: ContextOrphanRow[] = input.events
    .filter(
      (event) =>
        isGlobeContextExternal(event) && !externalPinEventIds.has(event.id),
    )
    .map((event) => ({
      id: event.id,
      kind: "external_event",
      label: event.title,
      reason: "event marked external without remote/external pin row",
    }));

  return {
    externalPinCount: externalPinRows.length,
    privatePinCount: privatePinRows.length + input.localPinEventIds.size,
    orphanExternalPins,
    orphanExternalEvents,
  };
}

export function buildContextSnapshot(input: {
  events: readonly EventCandidate[];
  contacts: readonly PeerContact[];
  conversationMemories: readonly ConversationMemoryWire[];
  localPinEventIds: readonly string[];
  externalPinRows?: Array<{ event_id: string; visibility: "private" | "external" }>;
  liveTurns?: LiveTurnLogEntry[];
}): ContextSnapshot {
  const now = new Date().toISOString();
  const events = [...input.events];
  const peopleGraph = buildPeopleGraph({
    contacts: input.contacts,
    events,
    now: new Date(),
  });

  const saveTrajectory =
    typeof window !== "undefined" ? readSaveTrajectory() : [];
  const behavior = collectBehaviorSignals({
    saveHistory: saveTrajectory,
    hour: new Date().getHours(),
  });

  const localPinSet = new Set(input.localPinEventIds);
  const externalPinRows = input.externalPinRows ?? [];
  const externalPinEventIds = new Set(
    externalPinRows
      .filter((row) => row.visibility === "external")
      .map((row) => row.event_id),
  );

  const internal: ContextSnapshotInternalKpi = {
    eventCount: events.length,
    eventsByLifecycle: countBy(events, "lifecycle"),
    eventsByCategory: countBy(events, "category"),
    internalPinCount: localPinSet.size,
    externalVisibilityEventCount: events.filter((event) =>
      isGlobeContextExternal(event),
    ).length,
    peopleCount: peopleGraph.people.length,
    contactCount: peopleGraph.contactCount,
    discoveredPeopleCount: peopleGraph.discoveredCount,
    conversationMemoryCount: input.conversationMemories.length,
    saveTrajectoryCount: saveTrajectory.length,
    dominantTrajectoryCluster: behavior.trajectory.dominant_cluster,
  };

  const external = buildExternalKpi({
    events,
    externalPinRows,
    localPinEventIds: localPinSet,
  });

  const graph = buildContextGraph({
    events,
    peopleGraph,
    memories: input.conversationMemories,
    pinEventIds: localPinSet,
    externalPinEventIds,
  });

  const liveStream = buildLiveStreamRows(input.liveTurns ?? []);

  const alerts = detectContextAlerts({ internal, external, liveStream });

  return {
    builtAt: now,
    internal,
    external,
    graph,
    alerts,
    liveStream,
  };
}
