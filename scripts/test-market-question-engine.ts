#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveMarketQuestionEngine } from "../lib/globe/market/question-engine";

function main() {
  const iphone = resolveMarketQuestionEngine({
    text: "아이폰15 프로 사고 싶어요",
    productName: "아이폰 15 프로",
    role: "seeking",
  });
  assert.equal(iphone.category, "smartphone");
  assert.ok(iphone.topFactors.length >= 3);
  assert.ok(iphone.topFactors.length <= 5);
  assert.ok(iphone.topFactors.some((f) => f.key === "batteryHealth"));
  assert.ok(iphone.topFactors.every((f) => f.question.length > 4));
  const weightSum = iphone.topFactors.reduce((acc, f) => acc + f.weight, 0);
  assert.ok(Math.abs(weightSum - 1) < 0.05);

  const galaxy = resolveMarketQuestionEngine({
    text: "갤럭시 S24 구합니다",
    role: "seeking",
  });
  assert.equal(galaxy.category, "smartphone");

  const tent = resolveMarketQuestionEngine({
    text: "중고 캠핑 텐트 찾아요",
    role: "seeking",
  });
  assert.equal(tent.category, "camping");

  const car = resolveMarketQuestionEngine({
    text: "그랜저 구매 희망 주행 5만km 이하",
    role: "seeking",
  });
  assert.equal(car.category, "vehicle");
  assert.ok(car.topFactors.some((f) => f.key === "mileage"));

  const filled = resolveMarketQuestionEngine({
    text: "아이폰15 프로 사고 싶어요",
    role: "seeking",
    existingDetail: {
      prioritySlots: { battery_health: 85, cosmetic_grade: "good" },
    },
    priceMinKrw: 700_000,
    priceMaxKrw: 800_000,
  });
  assert.ok(!filled.topFactors.some((f) => f.key === "batteryHealth"));
  assert.ok(!filled.topFactors.some((f) => f.key === "scratchLevel"));
  assert.ok(!filled.topFactors.some((f) => f.key === "price"));

  const camera = resolveMarketQuestionEngine({
    text: "소니 A7M4 구합니다",
    role: "seeking",
  });
  assert.equal(camera.category, "camera");

  console.log("test-market-question-engine: ok");
}

main();
