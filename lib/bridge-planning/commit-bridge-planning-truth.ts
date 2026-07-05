"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  applyBridgePlanningTruthToEvent,
  buildBridgePlanningTruthPatch,
} from "@/lib/bridge-planning/apply-bridge-planning-truth";
import {
  canCommitBridgePlanningTruth,
} from "@/lib/bridge-planning/read-bridge-planning-truth";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { updateExperienceBridgePlanningTruthRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { clearBridgePlanningProposalMetadata } from "@/lib/bridge-planning/planning-history";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type CommitBridgePlanningTruthInput = {
  event: EventCandidate;
  updatedByUserId: string;
  destinationLabel: string;
  pathLabels: readonly string[];
  pinnedLegIndex: number;
  goalKo?: string | null;
  flowStrokeStyle?: "solid" | "dashed";
};

/** Host Commit — local EventCandidate + remote bridge snapshot (v1 host-only). */
export async function commitBridgePlanningTruth(
  input: CommitBridgePlanningTruthInput,
): Promise<EventCandidate> {
  const truth = buildBridgePlanningTruthPatch(input);
  let nextEvent = applyBridgePlanningTruthToEvent({
    event: input.event,
    truth,
  });

  nextEvent = {
    ...nextEvent,
    metadata: clearBridgePlanningProposalMetadata(
      (nextEvent.metadata ?? {}) as Record<string, unknown>,
    ),
  };

  nextEvent = commitEventUpsert({
    id: nextEvent.id,
    title: nextEvent.title,
    category: nextEvent.category,
    source: nextEvent.source,
    lifecycle: nextEvent.lifecycle,
    datetime: nextEvent.datetime,
    place: nextEvent.place,
    containerId: nextEvent.containerId,
    confidence: nextEvent.confidence,
    metadata: nextEvent.metadata,
    lifecycleUpdatedAt: nextEvent.lifecycleUpdatedAt ?? truth.updatedAtIso,
    updatedAt: truth.updatedAtIso,
  });

  if (
    isBridgeLinkedEventId(nextEvent.id) &&
    canCommitBridgePlanningTruth(nextEvent)
  ) {
    try {
      await updateExperienceBridgePlanningTruthRemote({ event: nextEvent });
    } catch {
      /* local commit stands — remote sync retries on next bridge pull */
    }
    notifyBridgeSharedMediaUpdated();
  }

  return nextEvent;
}
