/**
 * Globe Brief Replay — stop builder SSOT (3D flies same order as Reality Draft).
 */
import assert from "node:assert/strict";
import {
  buildBriefReplayStops,
  clearContextWorkspace,
  clearWorkspaceChat,
  prepareTripWorkspaceDraft,
} from "../lib/context-workspace";

const CTX = "test:globe-brief-replay-stops";

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

const state = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 추천 일정",
  contextEventId: CTX,
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});
assert.ok(state?.realityDraft);

const stops = buildBriefReplayStops(state!);
assert.ok(stops.length >= 4);

const dayOrder = state!.realityDraft!.days.flatMap((d) =>
  d.nodes.map((n) => n.nodeId),
);
const filtered = dayOrder.filter((id) => stops.some((s) => s.id === id));
assert.deepEqual(
  stops.map((s) => s.id),
  filtered.slice(0, stops.length),
);

const subset = buildBriefReplayStops(state!, [stops[2]!.id, stops[0]!.id]);
assert.equal(subset.length, 2);
assert.equal(subset[0]!.id, stops[2]!.id);

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
console.log("ok: globe brief replay stop order");
