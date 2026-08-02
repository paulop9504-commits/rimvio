/**
 * Smoke: Object Scoped Prompt — Object Context + Intent → Simulation → Prepare.
 */
import assert from "node:assert/strict";
import {
  parseObjectScopedIntent,
  runObjectScopedPrompt,
  looksLikeGeneralChatEscape,
} from "@/lib/callout/scoped-prompt";
import type { RimvioObject } from "@/lib/callout/types";

const object: RimvioObject = {
  id: "hotel_123",
  type: "hotel",
  title: "Namba Hotel",
  location: { lat: 34.66, lng: 135.5 },
  contextId: "ctx_1",
  state: "shortlisted",
  evidence: [],
  actions: [],
  facts: {
    priceLabelKo: "120,000원",
    rating: 8.8,
    reviewSummaryKo: null,
    whyLinesKo: ["난바역 4분"],
    canPrepare: true,
    selected: true,
    bookmarked: false,
    inCompare: false,
  },
};

assert.equal(looksLikeGeneralChatEscape("너는 누구야?"), true);
assert.equal(looksLikeGeneralChatEscape("조식 좋은 곳으로 바꿔"), false);

const intent = parseObjectScopedIntent("조식 좋은 곳으로 바꿔");
assert.ok(!("reject" in intent));
if (!("reject" in intent)) {
  assert.equal(intent.kind, "change");
  assert.ok(intent.axes.includes("breakfast"));
}

const rejected = parseObjectScopedIntent("안녕 날씨 어때");
assert.ok("reject" in rejected);

const result = runObjectScopedPrompt({
  request: {
    object,
    utterance: "조식 좋은 곳으로 바꿔",
    contextId: "ctx_1",
  },
  proposals: [
    {
      objectId: "hotel_b",
      title: "Breakfast Inn",
      priceWon: 110_000,
      priceLabelKo: "110,000원",
      lat: 34.67,
      lng: 135.51,
    },
  ],
  anchors: [
    {
      day: 2,
      labelKo: "Day 2",
      lat: 34.665,
      lng: 135.505,
      nodeId: "poi_1",
    },
  ],
});

assert.equal(result.ok, true);
if (result.ok) {
  assert.equal(result.scope.objectId, "hotel_123");
  assert.equal(result.intent.kind, "change");
  assert.ok(result.stagesCompleted.includes("object_context"));
  assert.ok(result.stagesCompleted.includes("context_ai"));
  assert.ok(result.stagesCompleted.includes("simulation"));
  assert.ok(result.shouldCreateSimulation);
  assert.ok(result.simulationDraft);
  assert.equal(result.simulationDraft?.status, "preview");
  assert.equal(result.workspaceHint.op, "find_similar");
  assert.ok(!/ChatGPT|일반/.test(result.replyKo));
}

const prepareResult = runObjectScopedPrompt({
  request: {
    object,
    utterance: "예약 준비해줘",
    contextId: "ctx_1",
  },
  dateRange: {
    checkInIso: "2026-08-10",
    checkOutIso: "2026-08-12",
    labelKo: "2박",
  },
  guestCount: 2,
  price: { amountWon: 120_000, labelKo: "120,000원" },
});

assert.equal(prepareResult.ok, true);
if (prepareResult.ok) {
  assert.equal(prepareResult.intent.kind, "prepare");
  assert.ok(prepareResult.stagesCompleted.includes("prepare"));
  assert.equal(prepareResult.reservationDraft?.status, "draft");
}

console.log(
  "ok object-scoped-prompt",
  result.ok && result.intent.kind,
  result.ok && result.stagesCompleted.join("→"),
);
