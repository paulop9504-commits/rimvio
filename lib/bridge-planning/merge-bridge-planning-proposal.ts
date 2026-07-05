import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  bridgePlanningProposalQueuesEqual,
  clearBridgePlanningProposalMetadata,
  latestBridgePlanningProposalAtIso,
  mergeBridgePlanningProposalQueues,
  readBridgePlanningProposalQueue,
  setBridgePlanningProposalQueueMetadata,
} from "@/lib/bridge-planning/planning-proposal-queue";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function mergeBridgePlanningProposalFromRemote(input: {
  event: EventCandidate;
  remoteEvent: EventCandidate;
}): EventCandidate | null {
  const localQueue = readBridgePlanningProposalQueue(input.event);
  const remoteQueue = readBridgePlanningProposalQueue(input.remoteEvent);

  if (remoteQueue.length === 0) {
    if (localQueue.length === 0) {
      return null;
    }
    const remoteUpdatedMs = Date.parse(input.remoteEvent.updatedAt ?? "");
    const latestLocalMs = latestBridgePlanningProposalAtIso(localQueue);
    if (
      Number.isFinite(remoteUpdatedMs) &&
      Number.isFinite(latestLocalMs) &&
      remoteUpdatedMs >= latestLocalMs
    ) {
      return commitEventUpsert({
        id: input.event.id,
        title: input.event.title,
        category: input.event.category,
        source: input.event.source,
        lifecycle: input.event.lifecycle,
        datetime: input.event.datetime,
        place: input.event.place,
        description: input.event.description,
        containerId: input.event.containerId,
        confidence: input.event.confidence,
        metadata: clearBridgePlanningProposalMetadata(
          (input.event.metadata ?? {}) as Record<string, unknown>,
        ),
        lifecycleUpdatedAt: input.event.lifecycleUpdatedAt,
        updatedAt: new Date().toISOString(),
      });
    }
    return null;
  }

  const mergedQueue = mergeBridgePlanningProposalQueues(localQueue, remoteQueue);
  if (bridgePlanningProposalQueuesEqual(localQueue, mergedQueue)) {
    return null;
  }

  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    description: input.event.description,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata: setBridgePlanningProposalQueueMetadata(
      (input.event.metadata ?? {}) as Record<string, unknown>,
      mergedQueue,
    ),
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt,
    updatedAt: input.remoteEvent.updatedAt ?? new Date().toISOString(),
  });
}
