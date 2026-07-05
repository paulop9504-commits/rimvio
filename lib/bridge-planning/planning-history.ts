import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  BRIDGE_PLANNING_HISTORY_META_KEY,
  isBridgePlanningTruthV1,
  type BridgePlanningTruthV1,
} from "@/lib/bridge-planning/types";
export {
  bridgePlanningProposalQueuesEqual,
  clearBridgePlanningProposalMetadata,
  latestBridgePlanningProposalAtIso,
  mergeBridgePlanningProposalQueues,
  popBridgePlanningProposalHead,
  readBridgePlanningProposal,
  readBridgePlanningProposalForUser,
  readBridgePlanningProposalQueue,
  upsertBridgePlanningProposalMetadata,
} from "@/lib/bridge-planning/planning-proposal-queue";
export type { BridgePlanningProposalV1 } from "@/lib/bridge-planning/types";

export function readBridgePlanningHistory(
  event: EventCandidate | null | undefined,
): BridgePlanningTruthV1[] {
  const raw = event?.metadata?.[BRIDGE_PLANNING_HISTORY_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isBridgePlanningTruthV1);
}

export function appendBridgePlanningHistory(input: {
  metadata: Record<string, unknown>;
  truth: BridgePlanningTruthV1;
}): Record<string, unknown> {
  const previous = Array.isArray(input.metadata[BRIDGE_PLANNING_HISTORY_META_KEY])
    ? (input.metadata[BRIDGE_PLANNING_HISTORY_META_KEY] as unknown[]).filter(
        isBridgePlanningTruthV1,
      )
    : [];
  const withoutDuplicate = previous.filter((row) => row.revision !== input.truth.revision);
  const next = [...withoutDuplicate, input.truth].sort(
    (left, right) => left.revision - right.revision,
  );
  return {
    ...input.metadata,
    [BRIDGE_PLANNING_HISTORY_META_KEY]: next,
  };
}
