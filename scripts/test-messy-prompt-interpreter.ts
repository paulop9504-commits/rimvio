#!/usr/bin/env npx tsx

/**
 * Messy Prompt Interpreter — golden messy inputs (rules path, no network).
 */

import assert from "node:assert/strict";
import { interpretAndExecute } from "../lib/messy-prompt-interpreter";

const EXAMPLES: Array<{
  label: string;
  input: string;
  expectDomain: string;
  expectObjective?: string;
}> = [
  {
    label: "travel risk at airport",
    input: "이거 좀 여행처럼 리스크 없게 짜줘 공항인데 짐많음 체크인 3시",
    expectDomain: "travel_planning",
    expectObjective: "minimize_risk",
  },
  {
    label: "osaka lodging + food slang",
    input: "ㅇㅇ 오사카 숙소 개비싼거 빼고 ㄱㄱ 근처맛집도",
    expectDomain: "lodging",
  },
  {
    label: "late meeting navigation",
    input: "야 내일미팅 늦을듯 ㅠㅠ 빨리길찾기해줘",
    expectDomain: "navigation",
  },
  {
    label: "react scroll bug",
    input: "코드 ㄱㄱ 버그남 리액트에서 스크롤 안대",
    expectDomain: "coding_task",
    expectObjective: "fix_problem",
  },
  {
    label: "vague dinner",
    input: "아 몰라 그냥 저녁먹을데 알아서",
    expectDomain: "eatery",
  },
];

async function runExample(example: (typeof EXAMPLES)[number]) {
  const result = await interpretAndExecute(example.input, {
    useLlm: false,
    dryRun: false,
  });

  assert.equal(result.source, "rules");
  assert.equal(result.ir.domain, example.expectDomain, example.label);
  if (example.expectObjective) {
    assert.equal(result.ir.objective, example.expectObjective, example.label);
  }
  assert.ok(result.ir.professionalRewriteKo.length > 8, example.label);
  assert.ok(result.plan.steps.length >= 3, example.label);
  assert.ok(result.visualization.timeline.length >= 3, example.label);
  assert.ok(result.execution?.status === "done", example.label);

  console.log(`\n=== ${example.label} ===`);
  console.log("IN :", example.input);
  console.log("IR :", JSON.stringify(result.ir, null, 2));
  console.log("PLAN:", result.plan.titleKo);
  for (const step of result.plan.steps) {
    console.log(`  ${step.order}. ${step.labelKo}`);
  }
  console.log("OUT:", result.execution?.outputKo?.split("\n")[0]);
}

async function main() {
  for (const example of EXAMPLES) {
    await runExample(example);
  }
  console.log("\ntest-messy-prompt-interpreter: ok");
}

void main();
