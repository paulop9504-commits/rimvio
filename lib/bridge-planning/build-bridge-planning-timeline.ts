import type { ExperienceBridgeTimelineItem } from "@/lib/experience-bridge/experience-bridge-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import {
  readBridgePlanningHistory,
  readBridgePlanningProposal,
  readBridgePlanningProposalQueue,
} from "@/lib/bridge-planning/planning-history";
import { readBridgePlanningTruth } from "@/lib/bridge-planning/read-bridge-planning-truth";

function resolveAuthorName(input: {
  userId: string;
  participants: ReadonlyMap<string, string>;
  fallback: string;
}): string {
  return input.participants.get(input.userId) ?? input.fallback;
}

/** Planning commits + member proposals → bridge journey timeline rows. */
export function buildBridgePlanningTimelineItems(input: {
  event: EventCandidate;
  participants?: readonly { userId: string; displayName: string }[];
  hostUserId: string;
  hostName: string;
}): ExperienceBridgeTimelineItem[] {
  const participantNames = new Map(
    (input.participants ?? []).map((row) => [
      row.userId,
      row.displayName.trim() || copy.globe.bridgeInviteHostFallback,
    ]),
  );
  participantNames.set(input.hostUserId, input.hostName);

  const items: ExperienceBridgeTimelineItem[] = [];
  const history = readBridgePlanningHistory(input.event);
  const current = readBridgePlanningTruth(input.event);

  const commits =
    history.length > 0
      ? history
      : current
        ? [current]
        : [];

  for (const truth of commits) {
    const authorName = resolveAuthorName({
      userId: truth.updatedByUserId,
      participants: participantNames,
      fallback: input.hostName,
    });
    const pathLine = truth.pathLabels.join(" → ");
    items.push({
      id: `planning:commit:${truth.revision}`,
      kind: "planning_commit",
      capturedAtIso: truth.updatedAtIso,
      phase: "prep",
      ownerUserId: truth.updatedByUserId,
      authorDisplayName: authorName,
      body: copy.globe.bridgePlanningCommitLine(
        authorName,
        truth.destination.label,
        pathLine,
      ),
      viewOnly: true,
    });
  }

  const proposals = readBridgePlanningProposalQueue(input.event);
  const headProposal = readBridgePlanningProposal(input.event);

  for (const proposal of proposals) {
    const authorName =
      proposal.proposedByDisplayName?.trim() ||
      resolveAuthorName({
        userId: proposal.proposedByUserId,
        participants: participantNames,
        fallback: copy.globe.bridgeInviteHostFallback,
      });
    const isHead =
      headProposal?.proposedByUserId === proposal.proposedByUserId &&
      headProposal.proposedAtIso === proposal.proposedAtIso;
    items.push({
      id: `planning:proposal:${proposal.proposedByUserId}:${proposal.proposedAtIso}`,
      kind: "planning_proposal",
      capturedAtIso: proposal.proposedAtIso,
      phase: "prep",
      ownerUserId: proposal.proposedByUserId,
      authorDisplayName: authorName,
      body: copy.globe.bridgePlanningProposalLine(
        authorName,
        proposal.destinationLabel,
      ),
      viewOnly: proposal.proposedByUserId !== input.hostUserId,
      planningProposalIsHead: isHead,
    });
  }

  return items;
}
