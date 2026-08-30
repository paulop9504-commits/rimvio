/**
 * Integration test — "오사카 여행 숙소 찾아줘" end-to-end pipeline.
 *
 * Exercises all 11 engines cooperating on a single reality task.
 *
 * Run: npx tsx scripts/test-reality-pipeline.ts
 */

import { runRealityPipeline } from "@/lib/reality-orchestration";
import type { Constraint, ConstraintResource } from "@/lib/constraint-solver";
import type { ExplanationFactor } from "@/lib/explanation-engine";
import { registerAgentDelegation } from "@/lib/capability-registry/agent-delegation";

// Ensure agent delegation is registered for this test
registerAgentDelegation({
  agentId: "lodging",
  domain: "travel",
  can: ["BOOK_HOTEL", "SEARCH", "MAP"],
  cannot: ["payment.commit"],
  maxConcurrent: 3,
});

// ---------- Test helpers ----------

let stepCount = 0;
const stepExecutor = async (stepId: string): Promise<unknown> => {
  stepCount++;
  // Simulate async work
  await new Promise((r) => setTimeout(r, 5));
  return { stepId, mock: true, executedAt: new Date().toISOString() };
};

const compensationExecutor = async (action: string): Promise<void> => {
  console.log(`  ↩ 보상 실행: ${action}`);
  await new Promise((r) => setTimeout(r, 2));
};

// ---------- Scenarios ----------

async function testHappyPath() {
  console.log("\n═══ 시나리오 1: 정상 — 오사카 숙소 검색 ═══");

  const constraints: Constraint[] = [
    { id: "c-budget", kind: "budget", expression: "1박 15만원 이하", priority: "hard", source: "user" },
    { id: "c-location", kind: "location", expression: "난바역 도보 10분", priority: "soft", source: "user" },
  ];
  const resources: ConstraintResource[] = [
    { id: "r-hotel-a", kind: "hotel", satisfies: ["c-budget", "c-location"] },
  ];
  const factors: ExplanationFactor[] = [
    { kind: "budget", labelKo: "예산 15만원 이하", satisfied: true, value: "12만원" },
    { kind: "distance", labelKo: "난바역 도보 8분", satisfied: true, value: "8분" },
    { kind: "review_score", labelKo: "리뷰 상위 10%", satisfied: true, value: "4.7" },
  ];

  stepCount = 0;
  const result = await runRealityPipeline(
    {
      contextId: "ctx-osaka-trip",
      goal: "Find lodging near Namba",
      goalKo: "난바 근처 숙소 검색",
      domain: "travel",
      constraints,
      resources,
      estimatedCost: 120000,
      actionType: "search",
      requiredCapabilities: ["BOOK_HOTEL", "SEARCH"],
      explanationFactors: factors,
    },
    stepExecutor,
    compensationExecutor,
  );

  printResult(result);
  assert(result.success, "정상 시나리오는 성공해야 합니다");
  assert(result.haltedAt === null, "중단 없어야 합니다");
  assert(result.stages.length === 11, `11단계 모두 실행: got ${result.stages.length}`);
  assert(result.constraintResult?.feasible === true, "제약 조건 충족");
  assert(result.policyResult?.allowed === true, "정책 허용");
  assert(result.explanation !== null, "설명 생성됨");
  console.log("  ✅ 정상 시나리오 통과\n");
}

async function testBudgetExceeded() {
  console.log("═══ 시나리오 2: 예산 초과 — 정책 거부 ═══");

  const constraints: Constraint[] = [
    { id: "c-budget", kind: "budget", expression: "1박 30만원", priority: "hard", source: "user" },
  ];

  stepCount = 0;
  const result = await runRealityPipeline(
    {
      contextId: "ctx-osaka-budget",
      goal: "Book luxury hotel",
      goalKo: "럭셔리 호텔 예약",
      domain: "travel",
      constraints,
      resources: [{ id: "r-lux", kind: "hotel", satisfies: ["c-budget"] }],
      estimatedCost: 500000,
      actionType: "reserve",
      requiredCapabilities: ["lodging.reserve"],
      metadata: { budgetLimitWon: 200000 },
    },
    stepExecutor,
    compensationExecutor,
  );

  printResult(result);
  assert(!result.success, "예산 초과 시나리오는 실패해야 합니다");
  assert(result.haltedAt === "policy_gate", `정책 단계에서 중단: got ${result.haltedAt}`);
  console.log("  ✅ 예산 초과 시나리오 통과\n");
}

async function testPaymentApproval() {
  console.log("═══ 시나리오 3: 결제 승인 필요 — 정책 대기 ═══");

  stepCount = 0;
  const result = await runRealityPipeline(
    {
      contextId: "ctx-osaka-pay",
      goal: "Reserve hotel",
      goalKo: "호텔 예약",
      domain: "travel",
      constraints: [],
      resources: [],
      estimatedCost: 100000,
      actionType: "payment",
      requiredCapabilities: ["lodging.reserve"],
    },
    stepExecutor,
    compensationExecutor,
  );

  printResult(result);
  assert(!result.success, "결제는 승인 대기로 중단");
  assert(result.haltedAt === "policy_gate", `정책 단계에서 중단: got ${result.haltedAt}`);
  assert(result.haltReason?.includes("승인"), "승인 필요 사유 포함");
  console.log("  ✅ 결제 승인 시나리오 통과\n");
}

async function testConstraintConflict() {
  console.log("═══ 시나리오 4: 제약 조건 충돌 ═══");

  const constraints: Constraint[] = [
    { id: "c-cheap", kind: "budget", expression: "50만원 이하", priority: "hard", source: "user" },
    { id: "c-luxury", kind: "preference", expression: "럭셔리 풀빌라", priority: "hard", source: "user" },
  ];

  stepCount = 0;
  const result = await runRealityPipeline(
    {
      contextId: "ctx-conflict",
      goal: "Cheap luxury hotel",
      goalKo: "싼 럭셔리 호텔",
      domain: "travel",
      constraints,
      resources: [],
      actionType: "search",
      requiredCapabilities: ["BOOK_HOTEL", "SEARCH"],
    },
    stepExecutor,
    compensationExecutor,
  );

  printResult(result);
  assert(!result.success, "충돌 시나리오는 실패해야 합니다");
  assert(result.haltedAt === "constraint_solve", `제약 단계에서 중단: got ${result.haltedAt}`);
  console.log("  ✅ 제약 조건 충돌 시나리오 통과\n");
}

// ---------- Utilities ----------

function printResult(r: Awaited<ReturnType<typeof runRealityPipeline>>) {
  console.log(`  결과: ${r.success ? "✅ 성공" : "❌ 실패"} (${r.totalDurationMs}ms)`);
  if (r.haltedAt) console.log(`  중단: [${r.haltedAt}] ${r.haltReason}`);
  for (const s of r.stages) {
    console.log(`  ${s.ok ? "✓" : "✗"} ${s.stage} (${s.durationMs}ms)${s.detail ? ` — ${s.detail}` : ""}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`❌ FAIL: ${msg}`);
}

// ---------- Run ----------

async function main() {
  console.log("Reality Orchestration Pipeline — 통합 테스트");
  console.log("11 engines cooperating on a single reality task\n");

  await testHappyPath();
  await testBudgetExceeded();
  await testPaymentApproval();
  await testConstraintConflict();

  console.log("══════════════════════════════════════");
  console.log("✅ 전체 4개 시나리오 통과");
  console.log("══════════════════════════════════════");
}

main().catch((e) => {
  console.error("❌ 테스트 실패:", e);
  process.exit(1);
});
