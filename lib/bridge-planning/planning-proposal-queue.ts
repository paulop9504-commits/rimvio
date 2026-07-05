import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  BRIDGE_PLANNING_PROPOSAL_META_KEY,
  BRIDGE_PLANNING_PROPOSAL_QUEUE_META_KEY,
  isBridgePlanningProposalV1,
  type BridgePlanningProposalV1,
} from "@/lib/bridge-planning/types";

function sortProposalQueue(
  queue: readonly BridgePlanningProposalV1[],
): BridgePlanningProposalV1[] {
  return [...queue].sort(
    (left, right) =>
      Date.parse(left.proposedAtIso) - Date.parse(right.proposedAtIso),
  );
}

function readLegacyBridgePlanningProposal(
  metadata: Record<string, unknown> | null | undefined,
): BridgePlanningProposalV1 | null {
  const raw = metadata?.[BRIDGE_PLANNING_PROPOSAL_META_KEY];
  return isBridgePlanningProposalV1(raw) ? raw : null;
}

function readBridgePlanningProposalQueueFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): BridgePlanningProposalV1[] {
  const raw = metadata?.[BRIDGE_PLANNING_PROPOSAL_QUEUE_META_KEY];
  if (Array.isArray(raw)) {
    const queue = sortProposalQueue(raw.filter(isBridgePlanningProposalV1));
    if (queue.length > 0) {
      return queue;
    }
  }
  const legacy = readLegacyBridgePlanningProposal(metadata);
  return legacy ? [legacy] : [];
}

function writeBridgePlanningProposalQueueMetadata(
  metadata: Record<string, unknown>,
  queue: readonly BridgePlanningProposalV1[],
): Record<string, unknown> {
  const sorted = sortProposalQueue(queue);
  if (sorted.length === 0) {
    return {
      ...metadata,
      [BRIDGE_PLANNING_PROPOSAL_QUEUE_META_KEY]: undefined,
      [BRIDGE_PLANNING_PROPOSAL_META_KEY]: undefined,
    };
  }
  return {
    ...metadata,
    [BRIDGE_PLANNING_PROPOSAL_QUEUE_META_KEY]: sorted,
    [BRIDGE_PLANNING_PROPOSAL_META_KEY]: sorted[0],
  };
}

export function readBridgePlanningProposalQueue(
  event: EventCandidate | null | undefined,
): BridgePlanningProposalV1[] {
  return readBridgePlanningProposalQueueFromMetadata(
    (event?.metadata ?? {}) as Record<string, unknown>,
  );
}

export function readBridgePlanningProposalForUser(
  event: EventCandidate | null | undefined,
  userId: string,
): BridgePlanningProposalV1 | null {
  const key = userId.trim();
  if (!key) {
    return null;
  }
  return (
    readBridgePlanningProposalQueue(event).find(
      (row) => row.proposedByUserId === key,
    ) ?? null
  );
}

export function readBridgePlanningProposal(
  event: EventCandidate | null | undefined,
): BridgePlanningProposalV1 | null {
  const queue = readBridgePlanningProposalQueue(event);
  return queue[0] ?? null;
}

export function upsertBridgePlanningProposalMetadata(
  metadata: Record<string, unknown>,
  proposal: BridgePlanningProposalV1,
): Record<string, unknown> {
  const queue = readBridgePlanningProposalQueueFromMetadata(metadata).filter(
    (row) => row.proposedByUserId !== proposal.proposedByUserId,
  );
  return writeBridgePlanningProposalQueueMetadata(metadata, [...queue, proposal]);
}

export function popBridgePlanningProposalHead(
  metadata: Record<string, unknown>,
): {
  metadata: Record<string, unknown>;
  popped: BridgePlanningProposalV1 | null;
} {
  const queue = readBridgePlanningProposalQueueFromMetadata(metadata);
  if (queue.length === 0) {
    return { metadata, popped: null };
  }
  const [popped, ...rest] = queue;
  return {
    metadata: writeBridgePlanningProposalQueueMetadata(metadata, rest),
    popped,
  };
}

export function clearBridgePlanningProposalMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return writeBridgePlanningProposalQueueMetadata(metadata, []);
}

export function mergeBridgePlanningProposalQueues(
  local: readonly BridgePlanningProposalV1[],
  remote: readonly BridgePlanningProposalV1[],
): BridgePlanningProposalV1[] {
  const byUser = new Map<string, BridgePlanningProposalV1>();
  for (const row of local) {
    byUser.set(row.proposedByUserId, row);
  }
  for (const row of remote) {
    const previous = byUser.get(row.proposedByUserId);
    if (
      !previous ||
      Date.parse(row.proposedAtIso) >= Date.parse(previous.proposedAtIso)
    ) {
      byUser.set(row.proposedByUserId, row);
    }
  }
  return sortProposalQueue([...byUser.values()]);
}

export function setBridgePlanningProposalQueueMetadata(
  metadata: Record<string, unknown>,
  queue: readonly BridgePlanningProposalV1[],
): Record<string, unknown> {
  return writeBridgePlanningProposalQueueMetadata(metadata, queue);
}

export function bridgePlanningProposalQueuesEqual(
  left: readonly BridgePlanningProposalV1[],
  right: readonly BridgePlanningProposalV1[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = sortProposalQueue(left);
  const sortedRight = sortProposalQueue(right);
  return sortedLeft.every((row, index) => {
    const other = sortedRight[index];
    return (
      other?.proposedByUserId === row.proposedByUserId &&
      other?.destinationLabel === row.destinationLabel &&
      other?.proposedAtIso === row.proposedAtIso
    );
  });
}

export function latestBridgePlanningProposalAtIso(
  queue: readonly BridgePlanningProposalV1[],
): number {
  if (queue.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }
  return Math.max(...queue.map((row) => Date.parse(row.proposedAtIso)));
}
