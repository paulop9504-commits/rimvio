/**
 * Bridge planning truth — merge + projection tests.
 * Run: npx tsx scripts/test-bridge-planning-truth.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  applyBridgePlanningTruthToEvent,
  buildBridgePlanningTruthPatch,
  buildBridgePlanningTimelineItems,
  clearBridgePlanningProposalMetadata,
  composeRealitySurfaceFromBridgeTruth,
  mergeBridgePlanningProposalFromRemote,
  mergeBridgePlanningTruthFromRemote,
  popBridgePlanningProposalHead,
  readBridgePlanningHistory,
  readBridgePlanningProposal,
  readBridgePlanningProposalQueue,
  readBridgePlanningTruth,
  resolveBridgePlanningSyncFeedback,
  upsertBridgePlanningProposalMetadata,
} from "@/lib/bridge-planning";
import { BRIDGE_PLANNING_PROPOSAL_META_KEY } from "@/lib/bridge-planning/types";
import { advanceRealitySurfaceDestination } from "@/lib/reality-surface/advance-ingress-flow";
import { compileGlobeIngress } from "@/lib/globe-ingress";
import { composeRealitySurfaceFromGlobeIngress } from "@/lib/reality-surface/project-globe-ingress";

function baseEvent(id: string): EventCandidate {
  return {
    id,
    title: "일본 여행",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: "2026-10-01T09:00:00+09:00",
    place: null,
    metadata: { experienceBridgeHost: true },
    createdAt: "2026-07-06T00:00:00.000Z",
    updatedAt: "2026-07-06T00:00:00.000Z",
  };
}

function testBuildAndReadTruth() {
  const event = baseEvent("evt-japan");
  const truth = buildBridgePlanningTruthPatch({
    event,
    updatedByUserId: "host-1",
    destinationLabel: "오사카",
    pathLabels: ["집", "공항", "오사카", "호텔"],
    pinnedLegIndex: 2,
  });
  assert.equal(truth.revision, 1);
  assert.equal(truth.destination.label, "오사카");
  const next = applyBridgePlanningTruthToEvent({ event, truth });
  assert.equal(readBridgePlanningTruth(next)?.revision, 1);
  assert.equal(next.place, "오사카");
  console.log("✓ build + apply planning truth");
}

function testMergeRemoteRevision() {
  const local = applyBridgePlanningTruthToEvent({
    event: baseEvent("evt-japan"),
    truth: buildBridgePlanningTruthPatch({
      event: baseEvent("evt-japan"),
      updatedByUserId: "host-1",
      destinationLabel: "도쿄",
      pathLabels: ["집", "공항", "도쿄", "호텔"],
      pinnedLegIndex: 2,
    }),
  });
  const remote = applyBridgePlanningTruthToEvent({
    event: baseEvent("evt-japan"),
    truth: buildBridgePlanningTruthPatch({
      event: baseEvent("evt-japan"),
      updatedByUserId: "host-1",
      destinationLabel: "오사카",
      pathLabels: ["집", "공항", "오사카", "호텔"],
      pinnedLegIndex: 2,
    }),
  });
  remote.metadata = {
    ...remote.metadata,
    bridgePlanningTruthV1: {
      ...(readBridgePlanningTruth(remote) as NonNullable<
        ReturnType<typeof readBridgePlanningTruth>
      >),
      revision: 2,
    },
  };

  const merged = mergeBridgePlanningTruthFromRemote({
    event: local,
    remoteEvent: remote,
  });
  assert.ok(merged);
  assert.equal(readBridgePlanningTruth(merged)?.destination.label, "오사카");
  assert.equal(readBridgePlanningTruth(merged)?.revision, 2);
  console.log("✓ merge remote planning truth by revision");
}

function testProjectionFromTruth() {
  const truth = buildBridgePlanningTruthPatch({
    event: baseEvent("evt-japan"),
    updatedByUserId: "host-1",
    destinationLabel: "오사카",
    pathLabels: ["집", "공항", "오사카", "호텔"],
    pinnedLegIndex: 2,
  });
  const projection = composeRealitySurfaceFromBridgeTruth({
    eventId: "evt-japan",
    truth,
  });
  assert.equal(projection.bridge?.pathLabels[2], "오사카");
  assert.equal(projection.bridge?.activeLegIndex, 2);
  console.log("✓ reality surface projection from bridge truth");
}

function testAdvanceThenTruthShape() {
  const session = composeRealitySurfaceFromGlobeIngress({
    compiled: compileGlobeIngress({ text: "일본 여행" }),
    eventId: "evt-japan",
  });
  const advanced = advanceRealitySurfaceDestination({
    session,
    destinationLabel: "오사카",
  });
  const truth = buildBridgePlanningTruthPatch({
    event: baseEvent("evt-japan"),
    updatedByUserId: "host-1",
    destinationLabel: "오사카",
    pathLabels: advanced.projection.bridge?.pathLabels ?? [],
    pinnedLegIndex: advanced.projection.bridge?.activeLegIndex ?? 0,
  });
  assert.equal(truth.pathLabels[2], "오사카");
  console.log("✓ ingress advance aligns with planning truth patch");
}

function testPlanningHistoryAppend() {
  const event = baseEvent("evt-japan");
  const first = buildBridgePlanningTruthPatch({
    event,
    updatedByUserId: "host-1",
    destinationLabel: "도쿄",
    pathLabels: ["집", "공항", "도쿄", "호텔"],
    pinnedLegIndex: 2,
  });
  const afterFirst = applyBridgePlanningTruthToEvent({ event, truth: first });
  const second = buildBridgePlanningTruthPatch({
    event: afterFirst,
    updatedByUserId: "host-1",
    destinationLabel: "오사카",
    pathLabels: ["집", "공항", "오사카", "호텔"],
    pinnedLegIndex: 2,
  });
  const afterSecond = applyBridgePlanningTruthToEvent({
    event: afterFirst,
    truth: second,
  });
  const history = readBridgePlanningHistory(afterSecond);
  assert.equal(history.length, 2);
  assert.equal(history[1]?.destination.label, "오사카");
  console.log("✓ planning history append on commit");
}

function testProposalRead() {
  const event: EventCandidate = {
    ...baseEvent("evt-japan"),
    metadata: {
      experienceBridgeParticipant: true,
      [BRIDGE_PLANNING_PROPOSAL_META_KEY]: {
        version: 1,
        proposedByUserId: "member-1",
        proposedByDisplayName: "민수",
        destinationLabel: "교토",
        proposedAtIso: "2026-07-06T01:00:00.000Z",
      },
    },
  };
  const proposal = readBridgePlanningProposal(event);
  assert.ok(proposal);
  assert.equal(proposal?.destinationLabel, "교토");
  console.log("✓ read member planning proposal");
}

function testPlanningTimeline() {
  const truth = buildBridgePlanningTruthPatch({
    event: baseEvent("evt-japan"),
    updatedByUserId: "host-1",
    destinationLabel: "오사카",
    pathLabels: ["집", "공항", "오사카", "호텔"],
    pinnedLegIndex: 2,
  });
  const event = applyBridgePlanningTruthToEvent({
    event: baseEvent("evt-japan"),
    truth,
  });
  const withProposal: EventCandidate = {
    ...event,
    metadata: {
      ...event.metadata,
      [BRIDGE_PLANNING_PROPOSAL_META_KEY]: {
        version: 1,
        proposedByUserId: "member-1",
        proposedByDisplayName: "민수",
        destinationLabel: "교토",
        proposedAtIso: "2026-07-06T02:00:00.000Z",
      },
    },
  };
  const items = buildBridgePlanningTimelineItems({
    event: withProposal,
    hostUserId: "host-1",
    hostName: "호스트",
    participants: [{ userId: "member-1", displayName: "민수" }],
  });
  assert.equal(items.filter((row) => row.kind === "planning_commit").length, 1);
  assert.equal(items.filter((row) => row.kind === "planning_proposal").length, 1);
  console.log("✓ planning timeline commit + proposal rows");
}

function testProposalClearMetadata() {
  const cleared = clearBridgePlanningProposalMetadata({
    bridgePlanningProposalV1: {
      version: 1,
      proposedByUserId: "member-1",
      destinationLabel: "교토",
      proposedAtIso: "2026-07-06T01:00:00.000Z",
    },
  });
  assert.equal(cleared.bridgePlanningProposalV1, undefined);
  console.log("✓ clear planning proposal metadata");
}

function testProposalMergeClearFromRemote() {
  const local: EventCandidate = {
    ...baseEvent("evt-japan"),
    metadata: {
      experienceBridgeParticipant: true,
      [BRIDGE_PLANNING_PROPOSAL_META_KEY]: {
        version: 1,
        proposedByUserId: "member-1",
        destinationLabel: "교토",
        proposedAtIso: "2026-07-06T01:00:00.000Z",
      },
    },
  };
  const remote: EventCandidate = {
    ...baseEvent("evt-japan"),
    metadata: { experienceBridgeParticipant: true },
    updatedAt: "2026-07-06T02:00:00.000Z",
  };
  const merged = mergeBridgePlanningProposalFromRemote({ event: local, remoteEvent: remote });
  assert.ok(merged);
  assert.equal(readBridgePlanningProposal(merged), null);
  console.log("✓ merge clears local proposal when remote cleared");
}

function testProposalMergeClearAfterAccept() {
  const proposal = {
    version: 1 as const,
    proposedByUserId: "member-1",
    destinationLabel: "오사카",
    proposedAtIso: "2026-07-06T01:00:00.000Z",
  };
  const local: EventCandidate = {
    ...baseEvent("evt-japan"),
    metadata: {
      experienceBridgeParticipant: true,
      [BRIDGE_PLANNING_PROPOSAL_META_KEY]: proposal,
    },
    updatedAt: "2026-07-06T01:00:00.000Z",
  };
  const truth = buildBridgePlanningTruthPatch({
    event: baseEvent("evt-japan"),
    updatedByUserId: "host-1",
    destinationLabel: "오사카",
    pathLabels: ["집", "공항", "오사카", "호텔"],
    pinnedLegIndex: 2,
  });
  const remote: EventCandidate = {
    ...applyBridgePlanningTruthToEvent({ event: baseEvent("evt-japan"), truth }),
    metadata: {
      experienceBridgeHost: true,
      bridgePlanningTruthV1: truth,
    },
    updatedAt: "2026-07-06T02:00:00.000Z",
  };
  const merged = mergeBridgePlanningProposalFromRemote({ event: local, remoteEvent: remote });
  assert.ok(merged);
  assert.equal(readBridgePlanningProposal(merged), null);
  console.log("✓ merge clears proposal after host accept");
}

function testPlanningSyncFeedbackAccepted() {
  const proposal = {
    version: 1 as const,
    proposedByUserId: "member-1",
    destinationLabel: "오사카",
    proposedAtIso: "2026-07-06T01:00:00.000Z",
  };
  const before: EventCandidate = {
    ...baseEvent("evt-japan"),
    metadata: {
      experienceBridgeParticipant: true,
      [BRIDGE_PLANNING_PROPOSAL_META_KEY]: proposal,
    },
  };
  const truth = buildBridgePlanningTruthPatch({
    event: before,
    updatedByUserId: "host-1",
    destinationLabel: "오사카",
    pathLabels: ["집", "공항", "오사카", "호텔"],
    pinnedLegIndex: 2,
  });
  const after = applyBridgePlanningTruthToEvent({ event: before, truth });
  const afterCleared: EventCandidate = {
    ...after,
    metadata: clearBridgePlanningProposalMetadata(
      (after.metadata ?? {}) as Record<string, unknown>,
    ),
  };
  const feedback = resolveBridgePlanningSyncFeedback({
    viewerUserId: "member-1",
    beforeEvent: before,
    afterEvent: afterCleared,
  });
  assert.equal(feedback?.kind, "proposal_accepted");
  console.log("✓ sync feedback accepted");
}

function testPlanningSyncFeedbackRejected() {
  const proposal = {
    version: 1 as const,
    proposedByUserId: "member-1",
    destinationLabel: "교토",
    proposedAtIso: "2026-07-06T01:00:00.000Z",
  };
  const before: EventCandidate = {
    ...baseEvent("evt-japan"),
    metadata: {
      experienceBridgeParticipant: true,
      [BRIDGE_PLANNING_PROPOSAL_META_KEY]: proposal,
    },
  };
  const after: EventCandidate = {
    ...before,
    metadata: clearBridgePlanningProposalMetadata(
      (before.metadata ?? {}) as Record<string, unknown>,
    ),
  };
  const feedback = resolveBridgePlanningSyncFeedback({
    viewerUserId: "member-1",
    beforeEvent: before,
    afterEvent: after,
  });
  assert.equal(feedback?.kind, "proposal_rejected");
  console.log("✓ sync feedback rejected");
}

function testProposalQueueUpsert() {
  const proposalA = {
    version: 1 as const,
    proposedByUserId: "member-1",
    proposedByDisplayName: "민수",
    destinationLabel: "교토",
    proposedAtIso: "2026-07-06T01:00:00.000Z",
  };
  const proposalB = {
    version: 1 as const,
    proposedByUserId: "member-2",
    proposedByDisplayName: "지우",
    destinationLabel: "오사카",
    proposedAtIso: "2026-07-06T02:00:00.000Z",
  };
  let metadata = upsertBridgePlanningProposalMetadata({}, proposalA);
  metadata = upsertBridgePlanningProposalMetadata(metadata, proposalB);
  const queue = readBridgePlanningProposalQueue({
    ...baseEvent("evt-japan"),
    metadata,
  });
  assert.equal(queue.length, 2);
  assert.equal(readBridgePlanningProposal({ ...baseEvent("evt-japan"), metadata })?.destinationLabel, "교토");
  console.log("✓ proposal queue upsert + FIFO head");
}

function testProposalQueuePopHead() {
  const metadata = upsertBridgePlanningProposalMetadata(
    upsertBridgePlanningProposalMetadata({}, {
      version: 1,
      proposedByUserId: "member-1",
      destinationLabel: "교토",
      proposedAtIso: "2026-07-06T01:00:00.000Z",
    }),
    {
      version: 1,
      proposedByUserId: "member-2",
      destinationLabel: "오사카",
      proposedAtIso: "2026-07-06T02:00:00.000Z",
    },
  );
  const { metadata: nextMetadata, popped } = popBridgePlanningProposalHead(metadata);
  assert.equal(popped?.destinationLabel, "교토");
  assert.equal(readBridgePlanningProposalQueue({ ...baseEvent("evt-japan"), metadata: nextMetadata }).length, 1);
  console.log("✓ proposal queue pop head");
}

function testPlanningSyncFeedbackHostCommitted() {
  const before: EventCandidate = {
    ...baseEvent("evt-japan"),
    metadata: { experienceBridgeParticipant: true },
  };
  const truth = buildBridgePlanningTruthPatch({
    event: before,
    updatedByUserId: "host-1",
    destinationLabel: "오사카",
    pathLabels: ["집", "공항", "오사카", "호텔"],
    pinnedLegIndex: 2,
  });
  const after = applyBridgePlanningTruthToEvent({ event: before, truth });
  const feedback = resolveBridgePlanningSyncFeedback({
    viewerUserId: "member-1",
    beforeEvent: before,
    afterEvent: after,
  });
  assert.equal(feedback?.kind, "host_committed");
  assert.equal(feedback?.destinationLabel, "오사카");
  console.log("✓ sync feedback host committed");
}

testBuildAndReadTruth();
testMergeRemoteRevision();
testProjectionFromTruth();
testAdvanceThenTruthShape();
testPlanningHistoryAppend();
testProposalRead();
testPlanningTimeline();
testProposalClearMetadata();
testProposalMergeClearFromRemote();
testProposalMergeClearAfterAccept();
testPlanningSyncFeedbackAccepted();
testPlanningSyncFeedbackRejected();
testProposalQueueUpsert();
testProposalQueuePopHead();
testPlanningSyncFeedbackHostCommitted();
console.log("\nAll bridge planning truth tests passed.");
