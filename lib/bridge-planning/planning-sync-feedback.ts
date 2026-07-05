import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  readBridgePlanningProposalForUser,
  readBridgePlanningProposalQueue,
} from "@/lib/bridge-planning/planning-history";
import { readBridgePlanningTruth } from "@/lib/bridge-planning/read-bridge-planning-truth";

export type BridgePlanningSyncFeedback =
  | { kind: "proposal_accepted"; destinationLabel: string }
  | { kind: "proposal_rejected"; destinationLabel: string }
  | { kind: "proposal_updated"; destinationLabel: string }
  | { kind: "host_committed"; destinationLabel: string };

export const BRIDGE_PLANNING_SYNC_FEEDBACK = "rimvio-bridge-planning-sync-feedback";

function resolveOwnProposalOutcome(input: {
  viewerUserId: string;
  beforeEvent: EventCandidate;
  afterEvent: EventCandidate;
}): BridgePlanningSyncFeedback | null {
  const viewerId = input.viewerUserId.trim();
  const beforeProposal = readBridgePlanningProposalForUser(
    input.beforeEvent,
    viewerId,
  );
  if (!beforeProposal) {
    return null;
  }

  const afterProposal = readBridgePlanningProposalForUser(
    input.afterEvent,
    viewerId,
  );
  if (
    afterProposal &&
    afterProposal.destinationLabel !== beforeProposal.destinationLabel
  ) {
    return {
      kind: "proposal_updated",
      destinationLabel: afterProposal.destinationLabel,
    };
  }

  if (afterProposal) {
    return null;
  }

  const beforeTruth = readBridgePlanningTruth(input.beforeEvent);
  const afterTruth = readBridgePlanningTruth(input.afterEvent);
  const destinationLabel = beforeProposal.destinationLabel;

  if (
    afterTruth &&
    afterTruth.destination.label === destinationLabel &&
    (!beforeTruth || afterTruth.revision > beforeTruth.revision)
  ) {
    return { kind: "proposal_accepted", destinationLabel };
  }

  if (
    afterTruth &&
    (!beforeTruth || afterTruth.revision > beforeTruth.revision) &&
    afterTruth.updatedByUserId !== viewerId
  ) {
    return {
      kind: "host_committed",
      destinationLabel: afterTruth.destination.label,
    };
  }

  return { kind: "proposal_rejected", destinationLabel };
}

function resolveHostCommitForMember(input: {
  viewerUserId: string;
  beforeEvent: EventCandidate;
  afterEvent: EventCandidate;
}): BridgePlanningSyncFeedback | null {
  const viewerId = input.viewerUserId.trim();
  if (!viewerId) {
    return null;
  }
  if (input.afterEvent.metadata?.experienceBridgeHost === true) {
    return null;
  }
  if (input.afterEvent.metadata?.experienceBridgeParticipant !== true) {
    return null;
  }

  const beforeTruth = readBridgePlanningTruth(input.beforeEvent);
  const afterTruth = readBridgePlanningTruth(input.afterEvent);
  if (
    !afterTruth ||
    afterTruth.updatedByUserId === viewerId ||
    (beforeTruth && afterTruth.revision <= beforeTruth.revision)
  ) {
    return null;
  }

  return {
    kind: "host_committed",
    destinationLabel: afterTruth.destination.label,
  };
}

export function resolveBridgePlanningSyncFeedback(input: {
  viewerUserId: string;
  beforeEvent: EventCandidate;
  afterEvent: EventCandidate;
}): BridgePlanningSyncFeedback | null {
  const viewerId = input.viewerUserId.trim();
  if (!viewerId) {
    return null;
  }

  const ownOutcome = resolveOwnProposalOutcome(input);
  if (ownOutcome) {
    return ownOutcome;
  }

  return resolveHostCommitForMember(input);
}

export function notifyBridgePlanningSyncFeedback(
  feedback: BridgePlanningSyncFeedback,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(BRIDGE_PLANNING_SYNC_FEEDBACK, { detail: feedback }),
  );
}

export function countBridgePlanningProposals(
  event: EventCandidate | null | undefined,
): number {
  return readBridgePlanningProposalQueue(event).length;
}
