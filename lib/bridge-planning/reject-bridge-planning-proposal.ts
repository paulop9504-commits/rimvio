"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readBridgePlanningProposal } from "@/lib/bridge-planning/planning-history";
import { popBridgePlanningProposalHead } from "@/lib/bridge-planning/planning-proposal-queue";
import { canCommitBridgePlanningTruth } from "@/lib/bridge-planning/read-bridge-planning-truth";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { updateExperienceBridgePlanningProposalRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";

/** Host declines head member proposal — pops FIFO queue entry. */
export async function rejectBridgePlanningProposal(input: {
  event: EventCandidate;
  hostUserId: string;
}): Promise<EventCandidate | null> {
  if (!canCommitBridgePlanningTruth(input.event)) {
    return null;
  }
  if (!readBridgePlanningProposal(input.event)) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const { metadata } = popBridgePlanningProposalHead(
    (input.event.metadata ?? {}) as Record<string, unknown>,
  );
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
    metadata,
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt,
    updatedAt: nowIso,
  });

  if (isBridgeLinkedEventId(nextEvent.id)) {
    try {
      await updateExperienceBridgePlanningProposalRemote({ event: nextEvent });
    } catch {
      /* local clear stands */
    }
    notifyBridgeSharedMediaUpdated();
  }

  return nextEvent;
}
