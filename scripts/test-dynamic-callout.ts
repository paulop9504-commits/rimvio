/**
 * Smoke: Dynamic Callout — same hotel, situation-driven UI Schema.
 * Discover / Compare / Prepare · fixedUi forbidden · Commit = Field handoff.
 */
import assert from "node:assert/strict";
import {
  DYNAMIC_CALLOUT_STATES,
  buildDynamicCallout,
  formatDynamicCalloutUxKo,
  resolveDynamicCalloutState,
  schemasForSameObjectAcrossStates,
} from "@/lib/callout/dynamic";

assert.deepEqual(
  [...DYNAMIC_CALLOUT_STATES],
  ["Discover", "Analyze", "Compare", "Simulate", "Prepare", "Commit"],
);

const hotel = {
  id: "hotel_namba",
  title: "Namba Hotel",
  type: "hotel",
  priceLabelKo: "120,000원",
  priceWon: 120_000,
  whyLinesKo: ["난바역 4분", "예산 범위"],
  evidence: [
    {
      id: "ev1",
      title: "거리",
      value: "역 4분",
      present: true,
    },
    {
      id: "ev2",
      title: "가격",
      value: "120,000원",
      present: true,
    },
  ],
  canPrepare: true,
};

const context = {
  contextId: "ctx_osaka",
  titleKo: "Osaka Trip",
  purposeKo: "여행",
  situationKo: "발견",
};

// Discover
const discover = buildDynamicCallout({
  object: hotel,
  context,
  intent: { action: "filter", target: "hotel", rawText: "호텔 보여줘" },
  agent: null,
});
assert.equal(discover.state, "Discover");
assert.equal(discover.fixedUi, false);
assert.equal(discover.commitForbiddenInCallout, true);
assert.ok(discover.blocks.some((b) => b.kind === "evidence"));
assert.ok(discover.blocks.some((b) => b.kind === "why" && b.labelKo === "추천 이유"));

const discoverUx = formatDynamicCalloutUxKo(discover);
assert.ok(discoverUx.includes("Evidence"));
assert.ok(discoverUx.includes("추천 이유"));

// Compare — same hotel, different situation
const compare = buildDynamicCallout({
  object: hotel,
  context: { ...context, situationKo: "비교" },
  intent: { action: "compare", target: "hotel", rawText: "비교해줘" },
  agent: {
    phase: "validate",
    problemKo: "가격 상승",
    recommendationKo: "대체 호텔 발견",
    draftId: null,
    alternativesKo: ["Capsule Alt"],
  },
  compare: {
    alternativeTitle: "Capsule Alt",
    priceDeltaWon: -40_000,
    priceDeltaKo: "가격 40,000원 감소",
    distanceDeltaMeters: 200,
    distanceDeltaKo: "거리 200m 멀어짐",
    impactSummaryKo: "후보 가성비 개선",
  },
});
assert.equal(compare.state, "Compare");
assert.notEqual(compare.fingerprint, discover.fingerprint);
assert.ok(compare.blocks.some((b) => b.kind === "impact" && b.labelKo === "Impact"));
assert.ok(compare.blocks.some((b) => b.kind === "price_delta" && b.labelKo === "가격 변화"));
assert.ok(
  compare.blocks.some((b) => b.kind === "distance_delta" && b.labelKo === "거리 변화"),
);

const compareUx = formatDynamicCalloutUxKo(compare);
assert.ok(compareUx.includes("Impact"));
assert.ok(compareUx.includes("가격 변화"));
assert.ok(compareUx.includes("거리 변화"));

// Prepare
const prepare = buildDynamicCallout({
  object: hotel,
  context: { ...context, situationKo: "예약" },
  intent: { action: "prepare", target: "hotel", rawText: "예약 준비해" },
  agent: null,
});
assert.equal(prepare.state, "Prepare");
assert.ok(prepare.blocks.some((b) => b.kind === "prepare" && b.labelKo === "Prepare"));
assert.ok(prepare.actions.some((a) => a.verb === "handoff_field"));

// Commit state = Field handoff only (no Reality Commit in Callout)
const commit = buildDynamicCallout({
  object: hotel,
  context,
  intent: { action: "commit", target: "hotel", rawText: "확정할게" },
  agent: null,
});
assert.equal(commit.state, "Commit");
assert.ok(commit.blocks.some((b) => b.kind === "commit_handoff"));
assert.equal(commit.commitForbiddenInCallout, true);

// Same object · all states · distinct fingerprints
const all = schemasForSameObjectAcrossStates({
  base: {
    object: hotel,
    context,
    agent: {
      phase: "observe",
      problemKo: "가격 상승",
      recommendationKo: "대체 호텔 발견",
      draftId: null,
      alternativesKo: [],
    },
  },
  states: DYNAMIC_CALLOUT_STATES,
});
assert.equal(all.length, 6);
const fps = new Set(all.map((s) => s.fingerprint));
assert.equal(fps.size, 6);
assert.ok(all.every((s) => s.fixedUi === false));
assert.ok(all.every((s) => s.objectId === "hotel_namba"));

assert.equal(
  resolveDynamicCalloutState({
    object: hotel,
    context,
    intent: { action: "simulate", target: "hotel", rawText: "시뮬레이션" },
    agent: null,
  }),
  "Simulate",
);

console.log(
  "ok dynamic-callout same-hotel Discover→Compare→Prepare schemas · no fixed UI",
);
