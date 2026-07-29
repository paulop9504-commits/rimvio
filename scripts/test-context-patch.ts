/**
 * Context Patch Engine — integration test
 *
 * Simulates a real user session where inputs are
 * patches to the current context, not fresh chats.
 *
 * Run: npx tsx scripts/test-context-patch.ts
 */

import {
  lockContext,
  unlockContext,
  runContextTurn,
  type ActiveContext,
  type TaskExecutor,
} from "@/lib/context-patch";

// Mock task executor
const executor: TaskExecutor = async (taskId, ctx) => {
  await new Promise((r) => setTimeout(r, 3));
  return { taskId, location: ctx["location"], mock: true };
};

// Mock context creator
function createContext(utterance: string): ActiveContext {
  const location = utterance.match(/(오사카|제주|도쿄|서울)/)?.[1] ?? "unknown";
  return {
    contextId: `ctx-${Date.now()}`,
    label: `${location} 여행`,
    domain: "travel",
    state: "running",
    slots: { location, duration: 4, budget: 1000000 },
    lockedAt: new Date().toISOString(),
  };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`❌ FAIL: ${msg}`);
}

async function main() {
  console.log("Context Patch Engine — 통합 테스트\n");

  // Clean state
  unlockContext();

  // ═══ 1. 새 맥락 생성 ═══
  console.log("═══ 1. 새 맥락 생성: \"오사카 여행 계획해줘\" ═══");
  const r1 = await runContextTurn(
    { utterance: "오사카 여행 계획해줘" },
    executor,
    createContext,
  );
  console.log(`  Intent: ${r1.intent.intent} (${r1.intent.reason})`);
  console.log(`  Response: ${r1.responseKo}`);
  console.log(`  Context: ${r1.activeContext?.label}`);
  assert(r1.intent.intent === "create", "첫 입력은 create");
  assert(r1.activeContext?.label === "오사카 여행", "오사카 맥락 생성");
  console.log("  ✅ 통과\n");

  // ═══ 2. 위치 변경 (Patch) ═══
  console.log("═══ 2. 위치 변경: \"제주도로 이동\" ═══");
  const r2 = await runContextTurn(
    { utterance: "제주도로 이동" },
    executor,
  );
  console.log(`  Intent: ${r2.intent.intent} (${r2.intent.reason})`);
  console.log(`  Patches: ${r2.patchResult?.summary}`);
  console.log(`  Affected: ${r2.affectedTasks.map((t) => t.taskId).join(", ")}`);
  console.log(`  Response: ${r2.responseKo}`);
  assert(r2.intent.intent === "patch", "위치 변경은 patch");
  assert(r2.patchResult!.patches[0]!.key === "location", "location 패치");
  assert(String(r2.patchResult!.patches[0]!.newValue).startsWith("제주"), "제주로 변경");
  assert(r2.affectedTasks.length >= 5, `5개 이상 작업 영향: got ${r2.affectedTasks.length}`);
  assert(r2.recomputeResult!.allDone, "재계산 완료");
  console.log("  ✅ 통과\n");

  // ═══ 3. 기간 변경 (Patch) ═══
  console.log("═══ 3. 기간 변경: \"4박5일\" ═══");
  const r3 = await runContextTurn(
    { utterance: "4박5일" },
    executor,
  );
  console.log(`  Intent: ${r3.intent.intent}`);
  console.log(`  Patches: ${r3.patchResult?.summary}`);
  console.log(`  Affected: ${r3.affectedTasks.map((t) => t.taskId).join(", ")}`);
  console.log(`  Response: ${r3.responseKo}`);
  assert(r3.intent.intent === "patch", "기간 변경은 patch");
  assert(r3.patchResult!.patches[0]!.key === "duration", "duration 패치");
  assert(r3.patchResult!.patches[0]!.newValue === 5, "5일");
  console.log("  ✅ 통과\n");

  // ═══ 4. 실행 명령 (Execute) ═══
  console.log("═══ 4. 실행 명령: \"맛집 찾아줘\" ═══");
  const r4 = await runContextTurn(
    { utterance: "맛집 찾아줘" },
    executor,
  );
  console.log(`  Intent: ${r4.intent.intent} (${r4.intent.reason})`);
  console.log(`  Response: ${r4.responseKo}`);
  // "맛집" triggers activity extractor, "찾아줘" triggers execute
  assert(
    r4.intent.intent === "execute" || r4.intent.intent === "patch",
    `맛집 찾기는 execute 또는 patch: got ${r4.intent.intent}`,
  );
  console.log("  ✅ 통과\n");

  // ═══ 5. 질문 (Query) ═══
  console.log("═══ 5. 질문: \"날씨 어때?\" ═══");
  const r5 = await runContextTurn(
    { utterance: "날씨 어때?" },
    executor,
  );
  console.log(`  Intent: ${r5.intent.intent}`);
  assert(r5.intent.intent === "query", "질문은 query");
  assert(r5.patchResult === null, "query는 패치 없음");
  console.log("  ✅ 통과\n");

  // ═══ 6. 복합 패치 ═══
  console.log("═══ 6. 복합 패치: \"렌터카로 서울 100만원\" ═══");
  const r6 = await runContextTurn(
    { utterance: "렌터카로 서울 150만원" },
    executor,
  );
  console.log(`  Intent: ${r6.intent.intent}`);
  console.log(`  Patches: ${r6.patchResult?.summary}`);
  console.log(`  Affected: ${r6.affectedTasks.map((t) => t.taskId).join(", ")}`);
  const patchKeys = r6.patchResult!.patches.map((p) => p.key);
  assert(patchKeys.includes("transport"), "렌터카 패치");
  assert(patchKeys.includes("location"), "서울 패치");
  assert(patchKeys.includes("budget"), "150만원 패치");
  assert(r6.affectedTasks.length >= 5, "복합 패치는 많은 작업 영향");
  console.log("  ✅ 통과\n");

  // ═══ 7. 새 맥락 명시적 생성 ═══
  console.log("═══ 7. 명시적 새 맥락: \"새 여행 만들자\" ═══");
  const r7 = await runContextTurn(
    { utterance: "새 여행 만들자" },
    executor,
    createContext,
  );
  console.log(`  Intent: ${r7.intent.intent}`);
  assert(r7.intent.intent === "create", "명시적 create 신호");
  console.log("  ✅ 통과\n");

  // ═══ Summary ═══
  console.log("══════════════════════════════════════");
  console.log("✅ 전체 7개 시나리오 통과");
  console.log("══════════════════════════════════════");
  console.log("\n핵심: 사용자가 \"이 맥락에 이어서\"를 한 번도 말하지 않았습니다.");
  console.log("모든 입력이 자동으로 현재 Context에 Patch로 적용되었습니다.");
}

main().catch((e) => {
  console.error("❌ 테스트 실패:", e);
  process.exit(1);
});
