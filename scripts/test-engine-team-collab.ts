/**
 * Phase 1 — engine team pass / assist + registry soft-continue.
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  appendEngineEventWithTeamPass,
  buildEngineEventTimelineRows,
  isTradeDualApproved,
  planRimvioEngineTurn,
  readMultiOperatorApproval,
  readPendingEnginePass,
  readPendingFieldHandoff,
  readTeamPitchStatus,
  resolveDefaultPassReceiver,
} from "../lib/engine";
import { readEngineEventsFromMetadata } from "../lib/engine/engine-event-metadata";

assert.equal(resolveDefaultPassReceiver("lodging_search"), "eatery_search");
assert.equal(resolveDefaultPassReceiver("eatery_search"), "activity_search");
assert.equal(resolveDefaultPassReceiver("finance_prep"), null);

const afterScout = appendEngineEventWithTeamPass({
  metadata: {},
  engineId: "lodging_search",
  kind: "scout_complete",
  executionNodeId: "lodging",
  now: new Date("2026-07-15T00:00:00.000Z"),
});

const pending = readPendingEnginePass(afterScout.metadata);
assert.ok(pending);
assert.equal(pending.fromEngineId, "lodging_search");
assert.equal(pending.toEngineId, "eatery_search");
assert.equal(pending.reason, "pass");
assert.ok(pending.seedUtterance.includes("맛집"));

const events = readEngineEventsFromMetadata(afterScout.metadata);
assert.ok(events.some((row) => row.kind === "scout_complete"));
assert.ok(events.some((row) => row.kind === "pass"));
assert.ok(
  events.some(
    (row) =>
      row.kind === "pass" &&
      row.payload?.toEngineId === "eatery_search",
  ),
);

const rows = buildEngineEventTimelineRows(events);
assert.ok(rows.some((row) => row.labelKo.includes("패스")));

const afterMain = appendEngineEventWithTeamPass({
  metadata: afterScout.metadata,
  engineId: "lodging_search",
  kind: "main_selected",
  executionNodeId: "lodging",
  now: new Date("2026-07-15T00:01:00.000Z"),
});
assert.equal(readPendingEnginePass(afterMain.metadata)?.reason, "assist");
assert.ok(
  readEngineEventsFromMetadata(afterMain.metadata).some(
    (row) => row.kind === "assist",
  ),
);
const fieldHandoff = readPendingFieldHandoff(afterMain.metadata);
assert.ok(fieldHandoff);
assert.equal(fieldHandoff.tab, "queue");
assert.equal(fieldHandoff.fromEngineId, "lodging_search");
assert.ok(
  readEngineEventsFromMetadata(afterMain.metadata).some(
    (row) => row.kind === "field_ready",
  ),
);
assert.ok(
  buildEngineEventTimelineRows(
    readEngineEventsFromMetadata(afterMain.metadata),
  ).some((row) => row.labelKo.includes("맞춤")),
);

const approval = readMultiOperatorApproval(afterMain.metadata);
assert.ok(approval.stamps.operator);
const pitch = readTeamPitchStatus(afterMain.metadata);
assert.equal(pitch.ballSurface, "field_queue");
assert.ok(pitch.labelKo.includes("맞춤"));
assert.equal(
  isTradeDualApproved({
    seekingApprovedAtIso: "2026-07-15T00:00:00.000Z",
    listingApprovedAtIso: "2026-07-15T00:01:00.000Z",
  }),
  true,
);
assert.equal(
  isTradeDualApproved({
    seekingApprovedAtIso: "2026-07-15T00:00:00.000Z",
    listingApprovedAtIso: null,
  }),
  false,
);

function mockEvent(metadata: Record<string, unknown>): EventCandidate {
  return {
    id: "evt-team-pass",
    title: "오사카 여행",
    category: "travel",
    source: "peer_chat",
    lifecycle: "active",
    place: "오사카",
    confidence: 0.9,
    metadata,
    lifecycleUpdatedAt: "2026-07-15T00:00:00.000Z",
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
  };
}

const softEvent = mockEvent(afterScout.metadata);

const softPlan = planRimvioEngineTurn({
  message: "다음",
  event: softEvent,
});
assert.ok(softPlan);
assert.equal(softPlan.engineId, "eatery_search");

const lodgingPlan = planRimvioEngineTurn({
  message: "부산 서면쪽 숙소 예약 준비해",
  event: softEvent,
});
assert.ok(lodgingPlan);
assert.equal(lodgingPlan.engineId, "lodging_search");

console.log("test-engine-team-collab: ok");
