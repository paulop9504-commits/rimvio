/**
 * Trip Workspace draft — Osaka 4박5일 map prepare.
 * Run: npx tsx scripts/test-trip-workspace-draft.ts
 */

import assert from "node:assert/strict";
import {
  OSAKA_TRIP_DRAFT_STOPS,
  buildWorkspaceConciergeStatus,
  buildWorkspaceObjectCards,
  buildWorkspacePatchStrip,
  clearWorkspaceChat,
  prepareTripWorkspaceDraft,
  readContextWorkspace,
  readWorkspaceChat,
  shouldPrepareTripWorkspaceDraft,
} from "@/lib/context-workspace";
import { readWorldState } from "@/lib/workstream/world-state";

assert.equal(
  shouldPrepareTripWorkspaceDraft("오사카 여행 4박5일 준비해놔"),
  true,
);
assert.equal(shouldPrepareTripWorkspaceDraft("날씨 어때"), false);

const state = prepareTripWorkspaceDraft({
  utterance: "오사카 여행 4박5일 준비해놔",
  contextEventId: "ctx-trip-draft",
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});

assert.ok(state);
assert.ok(state!.nodes.length >= OSAKA_TRIP_DRAFT_STOPS.length - 1);
assert.ok(state!.nodes.some((n) => /쿠로몬/u.test(n.title)));
assert.ok(state!.nodes.some((n) => n.kind === "lodging"));
assert.ok(state!.summaryKo.includes("4박5일") || state!.query.includes("4박5일"));

const stored = readContextWorkspace("ctx-trip-draft");
assert.ok(stored && stored.nodes.length === state!.nodes.length);

const world = readWorldState("ctx-trip-draft");
assert.ok(world?.signals.some((s) => s.hint === "rain_indoor_revise"));

const concierge = buildWorkspaceConciergeStatus({
  anchorTitle: "난바 파크스",
  routeStopCount: state!.nodes.length,
  world,
  tripDraftReady: true,
});
assert.equal(concierge.suggestRainRevise, true);
assert.ok(concierge.congestionKo);
assert.ok(concierge.opportunityTitleKo?.includes("쿠로몬"));

clearWorkspaceChat("ctx-trip-chat-sync");
const synced = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 여행 준비해줘",
  contextEventId: "ctx-trip-chat-sync",
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});
assert.ok(synced);
const turns = readWorkspaceChat("ctx-trip-chat-sync");
assert.equal(turns.length, 2);
assert.equal(turns[0]!.role, "user");
assert.equal(turns[1]!.role, "assistant");
assert.ok(turns[1]!.patch?.summaryKo.includes("Workspace patch"));
assert.ok((turns[1]!.objects?.length ?? 0) >= 1);
assert.ok(turns[1]!.showLinkedWorkCta === true);
const cardIds = new Set((turns[1]!.objects ?? []).map((c) => c.nodeId));
for (const id of cardIds) {
  assert.ok(synced!.nodes.some((n) => n.id === id), `card nodeId ${id} missing on map`);
}
const patch = buildWorkspacePatchStrip(synced!);
assert.ok((patch.lodgingDelta ?? 0) >= 1);
assert.ok(buildWorkspaceObjectCards(synced!).length >= 1);

console.log("OK — trip-workspace-draft");
