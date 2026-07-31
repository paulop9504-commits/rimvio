/**
 * Intent Plan → Day/dayPart slots → burst inventory → Reality Draft.
 */
import assert from "node:assert/strict";
import {
  burstFillTripInventory,
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
assert.ok(slots.some((s) => s.dayPart === "morning"));
assert.ok(slots.some((s) => s.dayPart === "lunch"));
assert.ok(slots.some((s) => s.dayPart === "afternoon"));
assert.ok(slots.some((s) => s.dayPart === "dinner"));
assert.ok(slots.every((s) => Boolean(s.clusterId)));
// 4 days: d1 arrival+stay+dinner, d2–3 full, d4 morning+lunch → many slots
assert.ok(slots.length >= 10, `expected dayPart expansion, got ${slots.length}`);

const inventories = burstFillTripInventory({
  destinationKo: "제주",
  slots,
  dayCount: 4,
});
assert.equal(inventories.length, slots.length);
assert.ok(inventories.some((i) => i.picked != null));

const { stops, seededFrom } = materializeTripDraftStops({
  destinationKo: "제주",
  utterance: "제주 3박4일 추천 일정",
  slots,
  dayCount: 4,
  inventories,
});
assert.equal(seededFrom, "live_burst");
assert.ok(stops.every((s) => s.tags.some((t) => /^day_\d+$/u.test(t))));
assert.ok(stops.length >= 8);

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
assert.ok(jeju!.nodes.every((n) => n.actionReadyState === "ready"));
assert.ok(
  jeju!.nodes.some(
    (n) =>
      n.tags.includes("live_burst") ||
      n.tags.includes("skeleton") ||
      n.tags.includes("fallback_seed"),
  ),
);

const osakaSlots = compileTripEntitySlots({
  destinationKo: "오사카",
  stayLabelKo: "4박5일",
  days: 5,
  nights: 4,
});
assert.ok(osakaSlots.some((s) => s.clusterId === "usj"));
assert.ok(osakaSlots.some((s) => s.dayPart === "morning" && s.day === 2));

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
assert.ok(
  osaka!.nodes.some((n) => /usj|유니버설/iu.test(`${n.title} ${n.tags.join(" ")}`)),
);
assert.ok(osaka!.nodes.some((n) => n.kind === "lodging"));
assert.ok(osaka!.nodes.some((n) => n.kind === "eatery" || n.tags.includes("food")));
assert.ok((osaka!.realityDraft!.days.length ?? 0) >= 4);

clearWorkspaceChat(JEJU);
clearContextWorkspace(JEJU);
clearWorkspaceChat(OSAKA);
clearContextWorkspace(OSAKA);
console.log("ok: trip entity slots compiler (dayPart + burst)");
