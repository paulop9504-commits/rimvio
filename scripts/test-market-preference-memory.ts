#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  formatMarketPreferenceConfirmPrompt,
  formatMarketPreferenceValueLabelKo,
} from "../lib/globe/market/preference-memory/format-market-preference-label";
import {
  findMarketPreferenceMemory,
  resetMarketPreferenceMemoryForTests,
} from "../lib/globe/market/preference-memory/market-preference-memory-store";
import { MARKET_PREFERENCE_CONFIRM_THRESHOLD } from "../lib/globe/market/preference-memory/market-preference-memory-types";
import { recordMarketPreferenceSignal } from "../lib/globe/market/preference-memory/record-market-preference-signal";
import { resolveMarketQuestionPlan } from "../lib/globe/market/preference-memory/resolve-market-question-plan";

function main() {
  resetMarketPreferenceMemoryForTests();

  recordMarketPreferenceSignal({
    categorySlug: "smartphone",
    categoryId: "market.phone",
    role: "seeking",
    slotId: "battery_health",
    factorKey: "batteryHealth",
    value: 95,
    kind: "save_answer",
  });
  for (let i = 0; i < 3; i += 1) {
    recordMarketPreferenceSignal({
      categorySlug: "smartphone",
      categoryId: "market.phone",
      role: "seeking",
      slotId: "battery_health",
      factorKey: "batteryHealth",
      value: 95,
      kind: "confirm_apply",
    });
  }

  const memory = findMarketPreferenceMemory({
    categorySlug: "smartphone",
    categoryId: "market.phone",
    role: "seeking",
    slotId: "battery_health",
  });
  assert.ok(memory);
  assert.ok(memory!.confidence >= MARKET_PREFERENCE_CONFIRM_THRESHOLD);

  const label = formatMarketPreferenceValueLabelKo({
    slotId: "battery_health",
    value: 95,
    role: "seeking",
  });
  assert.match(label, /95%/);

  const prompt = formatMarketPreferenceConfirmPrompt({ valueLabelKo: label, role: "seeking" });
  assert.match(prompt, /지난번에도/);
  assert.match(prompt, /그대로 적용/);

  const plan = resolveMarketQuestionPlan({
    text: "아이폰15 프로 사고 싶어요",
    productName: "아이폰 15 프로",
    role: "seeking",
  });

  assert.ok(
    plan.confirmations.some(
      (item) => item.slotId === "battery_health" && item.value === 95,
    ),
  );
  assert.ok(!plan.questions.some((item) => item.slotId === "battery_health"));

  recordMarketPreferenceSignal({
    categorySlug: "smartphone",
    categoryId: "market.phone",
    role: "seeking",
    slotId: "battery_health",
    factorKey: "batteryHealth",
    value: 95,
    kind: "confirm_reject",
  });
  recordMarketPreferenceSignal({
    categorySlug: "smartphone",
    categoryId: "market.phone",
    role: "seeking",
    slotId: "battery_health",
    factorKey: "batteryHealth",
    value: 95,
    kind: "confirm_reject",
  });

  const planAfterReject = resolveMarketQuestionPlan({
    text: "아이폰15 프로 사고 싶어요",
    productName: "아이폰 15 프로",
    role: "seeking",
  });
  assert.ok(
    planAfterReject.questions.some((item) => item.slotId === "battery_health"),
  );

  const galaxyPlan = resolveMarketQuestionPlan({
    text: "갤럭시 S24 구합니다",
    role: "seeking",
    existingDetail: {
      prioritySlots: { battery_health: 95 },
    },
    priceMinKrw: null,
    priceMaxKrw: null,
  });
  assert.equal(galaxyPlan.confirmations.length, 0);

  console.log("test-market-preference-memory: ok");
}

main();
