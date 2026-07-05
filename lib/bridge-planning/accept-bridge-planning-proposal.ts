"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { commitBridgePlanningTruth } from "@/lib/bridge-planning/commit-bridge-planning-truth";
import {
  canCommitBridgePlanningTruth,
} from "@/lib/bridge-planning/read-bridge-planning-truth";
import { readBridgePlanningProposal } from "@/lib/bridge-planning/planning-history";
import { clearBridgePlanningProposalMetadata } from "@/lib/bridge-planning/planning-history";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { updateExperienceBridgePlanningProposalRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";

/** Host accepts member proposal → planning truth Commit + clear proposal. */
export async function acceptBridgePlanningProposal(input: {
  event: EventCandidate;
  hostUserId: string;
}): Promise<EventCandidate | null> {
  if (!canCommitBridgePlanningTruth(input.event)) {
    return null;
  }
  const proposal = readBridgePlanningProposal(input.event);
  if (!proposal) {
    return null;
  }

  const pathLabels =
    proposal.pathLabels && proposal.pathLabels.length > 0
      ? proposal.pathLabels
      : ["집", "공항", proposal.destinationLabel, "호텔"];

  const cleared = commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata: clearBridgePlanningProposalMetadata(
      (input.event.metadata ?? {}) as Record<string, unknown>,
    ),
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt,
    updatedAt: new Date().toISOString(),
  });

  const committed = await commitBridgePlanningTruth({
    event: cleared,
    updatedByUserId: input.hostUserId,
    destinationLabel: proposal.destinationLabel,
    pathLabels,
    pinnedLegIndex: 2,
    goalKo: cleared.title,
    flowStrokeStyle: "solid",
  });

  if (isBridgeLinkedEventId(committed.id)) {
    try {
      await updateExperienceBridgePlanningProposalRemote({ event: committed });
    } catch {
      /* proposal cleared locally */
    }
    notifyBridgeSharedMediaUpdated();
  }

  return committed;
}
