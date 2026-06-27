import type {
  ContextAlert,
  ContextSnapshotInternalKpi,
  ContextSnapshotExternalKpi,
  ContextLiveStreamRow,
} from "@/lib/dev/context-snapshot-types";

const RECALL_PATTERN =
  /(?:아까|방금|그때|전에|다시|기억|뭐\s*였|뭐더라|얘기(?:하)?(?:던|한)\s*거|다녀|어디)/u;

export function detectContextAlerts(input: {
  internal: ContextSnapshotInternalKpi;
  external: ContextSnapshotExternalKpi;
  liveStream: ContextLiveStreamRow[];
}): ContextAlert[] {
  const alerts: ContextAlert[] = [];

  if (
    input.internal.conversationMemoryCount > 0 &&
    input.liveStream.some(
      (row) =>
        RECALL_PATTERN.test(row.userMessage) &&
        !row.lineage.unifiedContext?.includes("ConversationMemory"),
    )
  ) {
    alerts.push({
      id: "recall-miss",
      kind: "recall_miss",
      severity: "medium",
      title: "Recall Miss",
      detail: "Recall-like utterance without unified memory block in recent stream.",
    });
  }

  if (input.external.orphanExternalPins.length > 0) {
    alerts.push({
      id: "orphan-pins",
      kind: "projection_orphan",
      severity: "high",
      title: "Projection Orphan",
      detail: `${input.external.orphanExternalPins.length} external pin(s) without matching EventCandidate.`,
    });
  }

  if (input.external.orphanExternalEvents.length > 0) {
    alerts.push({
      id: "orphan-events",
      kind: "projection_orphan",
      severity: "high",
      title: "Unpublished External Event",
      detail: `${input.external.orphanExternalEvents.length} event(s) marked external without remote pin.`,
    });
  }

  if (
    input.internal.eventCount > 3 &&
    input.internal.saveTrajectoryCount === 0
  ) {
    alerts.push({
      id: "trajectory-silence",
      kind: "trajectory_silence",
      severity: "low",
      title: "Trajectory Silence",
      detail: "Events exist but save trajectory is empty — behavior kernel may be disconnected.",
    });
  }

  if (
    input.liveStream.some(
      (row) =>
        row.lineage.unifiedContext === null &&
        /(?:정성|여행|맛집|친구)/u.test(row.userMessage),
    )
  ) {
    alerts.push({
      id: "context-fracture",
      kind: "context_fracture",
      severity: "medium",
      title: "Context Fracture",
      detail: "Rich-context utterance without unified context lineage in recent stream.",
    });
  }

  return alerts;
}
