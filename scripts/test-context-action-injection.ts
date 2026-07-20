import assert from "node:assert/strict";
import {
  buildContextLodgingBookingHandoff,
  buildContextLodgingHubCheckoutHandoff,
} from "../lib/globe/context-action-injection/build-context-action-handoff";
import {
  resolveContextActionIntent,
  isContextActionIntentMessage,
  extractBookingTargetLabel,
  placeLabelMatchesQuery,
} from "../lib/globe/context-action-injection/resolve-context-action-intent";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";
import { classifyIntentFamily } from "../lib/rule-engine/classify-intent-family";
import { parseGraphCommands } from "../lib/graph-command/parse-graph-commands";

const bookLodging = resolveContextActionIntent({
  message: "이 호텔 예약할게",
  pinnedResourceKind: "lodging",
});
assert.equal(bookLodging?.kind, "book_lodging");
assert.equal(bookLodging?.resourceKind, "lodging");

const bookYema = resolveContextActionIntent({
  message: "다이토요 예매할게",
  pinnedResourceKind: "lodging",
});
assert.equal(bookYema?.kind, "book_lodging");
assert.equal(extractBookingTargetLabel("다이토요 예매할게"), "다이토요");
assert.equal(
  placeLabelMatchesQuery("사우나&캡슐호텔 다이토요", "다이토요"),
  true,
);

const payLodging = resolveContextActionIntent({
  message: "숙소 결제할게",
});
assert.equal(payLodging?.kind, "pay_lodging");

const eateryOnly = resolveContextActionIntent({
  message: "맛집 예약해줘",
});
assert.equal(eateryOnly?.resourceKind, "eatery");

assert.equal(isContextActionIntentMessage("호텔 예약"), true);
assert.equal(isContextActionIntentMessage("다이토요 예매할게"), true);
assert.equal(isContextActionIntentMessage("더 가까운 곳"), false);

assert.equal(classifyIntentFamily("다이토요 예매할게"), "Reserve");
const cmds = parseGraphCommands("다이토요 예매할게");
assert.equal(cmds[0]?.op, "reserve_prep");
if (cmds[0]?.op === "reserve_prep") {
  assert.match(cmds[0].targetRef.labelKo, /다이토요/);
}

const emptySsot = {
  contextEventId: "evt-test",
  scoutContract: null,
  selectedAnchor: null,
  lensSession: null,
  lastBatch: null,
  reelKinds: [],
  reelItemCount: 0,
  composeTail: [],
  hasActiveSpec: true,
  explorationMode: "explore",
} as unknown as OperatorTurnSsot;

const plan = gateOperatorTurnSync({
  text: "다이토요 예매할게",
  ssot: emptySsot,
});
assert.equal(plan.tool, "task_injection");

const handoff = buildContextLodgingBookingHandoff({
  row: {
    name: "오사카 호텔",
    lat: 34.7,
    lng: 135.5,
    mapsUrl: "https://maps.google.com/example",
    priceKrw: 120000,
    checkInIso: "2026-07-10",
    checkOutIso: "2026-07-12",
  },
  intent: {
    kind: "book_lodging",
    resourceKind: "lodging",
    confidence: 1,
  },
});
assert.match(handoff.href, /google\.com\/travel\/hotels/);
assert.ok(!handoff.href.includes("maps.google.com"));
assert.match(handoff.labelKo, /예약/);

const hubHandoff = buildContextLodgingHubCheckoutHandoff({
  intent: {
    kind: "pay_lodging",
    resourceKind: "lodging",
    confidence: 1,
  },
});
assert.equal(hubHandoff.href, "rimvio://hub/lodging-checkout");
assert.match(hubHandoff.labelKo, /결제/);

console.log("test-context-action-injection: ok");
