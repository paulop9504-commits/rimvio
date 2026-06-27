import type { LiveTurnLogEntry } from "@/lib/self-learning/live-turn-types";

export type ContextSnapshotInternalKpi = {
  eventCount: number;
  eventsByLifecycle: Record<string, number>;
  eventsByCategory: Record<string, number>;
  internalPinCount: number;
  externalVisibilityEventCount: number;
  peopleCount: number;
  contactCount: number;
  discoveredPeopleCount: number;
  conversationMemoryCount: number;
  saveTrajectoryCount: number;
  dominantTrajectoryCluster: string | null;
};

export type ContextSnapshotExternalKpi = {
  externalPinCount: number;
  privatePinCount: number;
  orphanExternalPins: ContextOrphanRow[];
  orphanExternalEvents: ContextOrphanRow[];
};

export type ContextOrphanRow = {
  id: string;
  kind: "external_pin" | "external_event";
  label: string;
  reason: string;
};

export type ContextGraphNode = {
  id: string;
  kind: "event" | "person" | "place" | "memory" | "pin" | "external";
  label: string;
  detail?: string;
  searchTokens: string[];
};

export type ContextGraphEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
};

export type ContextAlert = {
  id: string;
  kind:
    | "context_fracture"
    | "recall_miss"
    | "projection_orphan"
    | "scope_drift"
    | "trajectory_silence";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export type ContextLiveStreamRow = {
  id: string;
  timestamp: string;
  userMessage: string;
  assistantSummary: string | null;
  routing: LiveTurnLogEntry["routing"];
  orchestratorTrace: string[];
  lineage: {
    eventKernel: string | null;
    unifiedContext: string | null;
    pipeline: string | null;
  };
};

export type ContextSnapshot = {
  builtAt: string;
  internal: ContextSnapshotInternalKpi;
  external: ContextSnapshotExternalKpi;
  graph: {
    nodes: ContextGraphNode[];
    edges: ContextGraphEdge[];
  };
  alerts: ContextAlert[];
  liveStream: ContextLiveStreamRow[];
};

export type ContextSnapshotServerPayload = {
  builtAt: string;
  liveStream: ContextLiveStreamRow[];
  externalPinRows: Array<{
    event_id: string;
    visibility: "private" | "external";
    updated_at?: string;
  }>;
  external: ContextSnapshotExternalKpi;
};
