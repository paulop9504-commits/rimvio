import assert from "node:assert/strict";
import {
  buildScoutNarrationPlan,
  narrateScoutPlan,
} from "../lib/globe/narrator-engine";

const priorMatcha = {
  eateryFocus: "말차 아이스크림",
  menuFocusId: "matcha_icecream",
  transport: null,
  budget: null,
  vibe: null,
  areaHint: null,
  excludeKeywords: [] as string[],
  updatedAtIso: "",
};

const sushiSpec = {
  version: 1 as const,
  resourceTypes: ["restaurant"] as const,
  transport: "walk" as const,
  budget: "medium" as const,
  vibe: "popular" as const,
  lodgingKind: "any" as const,
  radiusM: 800,
  eateryFocus: "스시 초밥",
};

const plan = buildScoutNarrationPlan({
  message: "초밥 찾아줘",
  spec: sushiSpec,
  priorConstraints: priorMatcha,
  previousSpec: {
    ...sushiSpec,
    eateryFocus: "말차 아이스크림",
  },
  anchorLabelKo: "도쿄",
});

assert.equal(plan.intent, "Search");
assert.equal(plan.mode, "Replace");
assert.equal(plan.domain, "Eatery");
assert.equal(plan.entityLabelKo, "초밥");
assert.deepEqual([...plan.dropLabelsKo], ["말차 아이스크림"]);
assert.equal(plan.anchorLabelKo, "도쿄");

const narration = narrateScoutPlan(plan);
assert.match(narration.understandingKo, /이해했습니다/);
assert.match(narration.understandingKo, /새로운 음식 검색/);
assert.match(narration.understandingKo, /말차/);
assert.match(narration.understandingKo, /초밥/);
assert.match(narration.understandingKo, /도쿄/);

const stepIds = narration.progressSteps.map((s) => s.id);
assert.ok(stepIds.includes("analyze"));
assert.ok(stepIds.includes("drop_prior"));
assert.ok(stepIds.includes("switch_entity"));
assert.ok(stepIds.includes("anchor"));
assert.ok(stepIds.includes("collect"));
assert.ok(
  narration.progressSteps.some((s) => s.textKo.includes("이전 검색 포커스 제거")),
);
assert.ok(narration.progressSteps.some((s) => s.textKo.includes("초밥")));

// Facet refine — Continue, keep prior dish in plan entity from spec
const refinePlan = buildScoutNarrationPlan({
  message: "더 싸게",
  spec: {
    ...sushiSpec,
    eateryFocus: "말차 아이스크림",
    budget: "low",
  },
  priorConstraints: priorMatcha,
  previousSpec: {
    ...sushiSpec,
    eateryFocus: "말차 아이스크림",
  },
  anchorLabelKo: "신주쿠",
});
assert.equal(refinePlan.mode, "Continue");
assert.equal(refinePlan.intent, "Refine");
assert.equal(refinePlan.dropLabelsKo.length, 0);

console.log("test-scout-narrator-engine: ok");
console.log("--- understanding ---");
console.log(narration.understandingKo);
console.log("--- progress ---");
for (const step of narration.progressSteps) {
  console.log(step.textKo);
}
