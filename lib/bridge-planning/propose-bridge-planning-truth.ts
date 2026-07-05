"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  upsertBridgePlanningProposalMetadata,
} from "@/lib/bridge-planning/planning-history";
import type { BridgePlanningProposalV1 } from "@/lib/bridge-planning/types";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { updateExperienceBridgePlanningProposalRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function isBridgeParticipantEvent(
  event: EventCandidate | null | undefined,
): boolean {
  return event?.metadata?.experienceBridgeParticipant === true;
}

export function canProposeBridgePlanningTruth(
  event: EventCandidate | null | undefined,
): boolean {
  if (!event?.id?.trim()) {
    return false;
  }
  if (event.metadata?.experienceBridgeHost === true) {
    return false;
  }
  return isBridgeParticipantEvent(event);
}

/** Member proposal — host must Commit to apply (v1). */
export async function proposeBridgePlanningTruth(input: {
  event: EventCandidate;
  proposedByUserId: string;
  proposedByDisplayName?: string | null;
  destinationLabel: string;
  pathLabels?: readonly string[];
}): Promise<EventCandidate> {
  const nowIso = new Date().toISOString();
  const proposal: BridgePlanningProposalV1 = {
    version: 1,
    proposedByUserId: input.proposedByUserId.trim(),
    proposedByDisplayName: input.proposedByDisplayName?.trim() || null,
    destinationLabel: input.destinationLabel.trim(),
    pathLabels: input.pathLabels ? [...input.pathLabels] : undefined,
    proposedAtIso: nowIso,
  };

  const nextEvent = commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata: upsertBridgePlanningProposalMetadata(
      (input.event.metadata ?? {}) as Record<string, unknown>,
      proposal,
    ),
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt ?? nowIso,
    updatedAt: nowIso,
  });

  if (isBridgeLinkedEventId(nextEvent.id) && canProposeBridgePlanningTruth(nextEvent)) {
    try {
      await updateExperienceBridgePlanningProposalRemote({ event: nextEvent });
    } catch {
      /* local stands */
    }
    notifyBridgeSharedMediaUpdated();
  }

  return nextEvent;
}
