import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { tryParseLodgingStayRevise } from "../lib/globe/context-hub/parse-lodging-stay-revise";
import { gateLodgingStayReviseAskChips } from "../lib/globe/operator-turn/gate-lodging-stay-revise-ask-chips";
import {
  clearLodgingStayRevisePending,
  readLodgingStayRevisePending,
} from "../lib/globe/context-hub/lodging-stay-revise-pending-store";
import {
  isLodgingStayReviseAffirmUtterance,
  isLodgingStayReviseRejectUtterance,
} from "../lib/globe/context-hub/lodging-stay-revise-affirm";
import {
  buildLodgingStayWindow,
  formatLodgingStayBadgeLabel,
} from "../lib/globe/context-hub/lodging-stay-window";

function mockEvent(input: {
  checkInIso: string;
  checkOutIso: string;
  guestCount?: number;
}): EventCandidate {
  const stamp = input.checkInIso;
  return {
    id: "ec-stay-revise-test",
    title: "오사카 여행",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    datetime: input.checkInIso,
    place: "오사카",
    description: undefined,
    confidence: 1,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    metadata: {
      feedPlanEnabled: true,
      planWindowEndIso: input.checkOutIso,
      planWindowConfidence: "confirmed",
      planNights: 4,
      contextLodgingGuestCount: input.guestCount ?? 2,
      contextLodgingRoomCount: 1,
    },
  };
}

const checkIn = "2030-08-01T03:00:00.000Z";
const checkOut4 = "2030-08-05T03:00:00.000Z"; // 4 nights
const event = mockEvent({ checkInIso: checkIn, checkOutIso: checkOut4 });

const parsed = tryParseLodgingStayRevise({
  text: "5박6일로 갈게",
  event,
});
assert.ok(parsed, "should parse 5박6일 revise");
assert.equal(parsed!.nights, 5);
assert.equal(parsed!.previousNights, 4);
assert.ok(parsed!.changed.nights);
assert.ok(parsed!.confirmHintKo.includes("5박6일"));

const noCue = tryParseLodgingStayRevise({
  text: "오사카 5박6일 숙소 찾아줘",
  event,
});
assert.equal(noCue, null, "fresh scout without revise cue must not revise");

const sameNights = tryParseLodgingStayRevise({
  text: "4박5일로 그대로 갈게",
  event,
});
assert.equal(sameNights, null, "unchanged nights → null");

const guests = tryParseLodgingStayRevise({
  text: "인원 3명으로 바꿔",
  event,
});
assert.ok(guests);
assert.equal(guests!.guestCount, 3);
assert.ok(guests!.changed.guests);

// Relative stay against pack Diff (same project continuity).
const relative = tryParseLodgingStayRevise({
  text: "하루 늘려",
  event,
});
assert.ok(relative, "하루 늘려 should revise +1 night");
assert.equal(relative!.previousNights, 4);
assert.equal(relative!.nights, 5);

const relativeFromPackOnly = tryParseLodgingStayRevise({
  text: "이틀 줄여",
  event: null,
  lodgingDiff: {
    selectedLodgingId: "gnode:x",
    selectedLodgingLabelKo: "APA",
    selectedPinId: "gnode:x",
    checkInIso: checkIn,
    checkOutIso: checkOut4,
    nights: 4,
    guestCount: 2,
    roomCount: 1,
    lastBatchId: "tool-search:x",
    lastBatchPlaceIds: ["apa-namba"],
    maxNightlyPriceKrw: null,
  },
});
assert.ok(relativeFromPackOnly);
assert.equal(relativeFromPackOnly!.nights, 2);

clearLodgingStayRevisePending("ec-stay-revise-test");
const plan = gateLodgingStayReviseAskChips({
  text: "5박6일로 바꿔줘",
  contextEventId: "ec-stay-revise-test",
  event,
});
assert.ok(plan);
assert.equal(plan!.tool, "ask_chips");
assert.equal(plan!.reason, "lodging_stay_revise");
assert.ok(plan!.chips.some((c) => c.value === "apply"));
assert.ok(readLodgingStayRevisePending("ec-stay-revise-test"));

assert.equal(isLodgingStayReviseAffirmUtterance("응"), true);
assert.equal(isLodgingStayReviseAffirmUtterance("반영해"), true);
assert.equal(isLodgingStayReviseRejectUtterance("아니야"), true);
assert.equal(isLodgingStayReviseAffirmUtterance("숙소 더 찾아"), false);

// Cursor Diff — confirmed event stay beats stale inventory stayWindow
// (no explicit row checkIn/Out — those still win for 1-night offers).
const eventFirst = buildLodgingStayWindow({
  event,
  row: {
    checkInIso: null,
    checkOutIso: null,
    stayWindow: {
      checkInIso: "2030-07-01T00:00:00.000Z",
      checkOutIso: "2030-07-02T00:00:00.000Z",
      nights: 1,
      confidence: "confirmed",
    },
  },
});
assert.ok(eventFirst);
assert.equal(eventFirst!.checkInIso, checkIn);
assert.equal(eventFirst!.checkOutIso, checkOut4);
assert.equal(eventFirst!.nights, 4);
const stayBadge = formatLodgingStayBadgeLabel(eventFirst);
assert.ok(
  stayBadge && stayBadge.includes("4박"),
  `badge should show 4박, got ${stayBadge}`,
);

clearLodgingStayRevisePending("ec-stay-revise-test");
console.log("test-lodging-stay-revise: ok");
