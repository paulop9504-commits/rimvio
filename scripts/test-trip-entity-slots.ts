/**
 * Intent Plan → Day/Entity slots → Reality Draft (non-Osaka + Osaka day tags).
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  compileTripEntitySlots,
  materializeTripDraftStops,
  prepareTripWorkspaceDraft,
  resolveTripDayCount,
} from "../lib/context-workspace";

const JEJU = "test:trip-slots-jeju";
const OSAKA = "test:trip-slots-osaka-days";

clearWorkspaceChat(JEJU);
clearContextWorkspace(JEJU);
clearWorkspaceChat(OSAKA);
clearContextWorkspace(OSAKA);

assert.equal(resolveTripDayCount({ nights: 3, days: 4 }), 4);

const slots = compileTripEntitySlots({
  destinationKo: "제주",
  stayLabelKo: "3박4일",
  days: 4,
  nights: 3,
});
assert.ok(slots.some((s) => s.entityKind === "flight" && s.day === 1));
assert.ok(slots.some((s) => s.entityKind === "lodging" && s.day === 1));
assert.ok(slots.some((s) => s.entityKind === "itinerary"));
assert.ok(slots.some((s) => s.entityKind === "eatery"));

const { stops, seededFrom } = materializeTripDraftStops({
  destinationKo: "제주",
  utterance: "제주 3박4일 추천 일정",
  slots,
  dayCount: 4,
});
assert.equal(seededFrom, "intent_slots");
assert.ok(stops.every((s) => s.tags.some((t) => /^day_\d+$/u.test(t))));
assert.ok(stops.length >= 3);

const jeju = prepareTripWorkspaceDraft({
  utterance: "제주 3박4일 추천 일정",
  contextEventId: JEJU,
  tripPrep: {
    destinationKo: "제주",
    nights: 3,
    days: 4,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});
assert.ok(jeju?.realityDraft);
assert.ok((jeju!.realityDraft!.days.length ?? 0) >= 2);
assert.ok(jeju!.nodes.some((n) => n.tags.includes("skeleton")));
assert.ok(jeju!.nodes.every((n) => n.actionReadyState === "ready"));

const osaka = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 추천 일정",
  contextEventId: OSAKA,
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});
assert.ok(osaka?.realityDraft);
assert.ok(osaka!.nodes.some((n) => n.tags.includes("day_1")));
assert.ok(osaka!.nodes.some((n) => /usj/iu.test(n.tags.join(" "))));

clearWorkspaceChat(JEJU);
clearContextWorkspace(JEJU);
clearWorkspaceChat(OSAKA);
clearContextWorkspace(OSAKA);
console.log("ok: trip entity slots compiler");
