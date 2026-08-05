/**
 * Workspace Agent Plan compile + L8 harness scaffold.
 * Run: npx tsx scripts/test-workspace-agent-plan.ts
 *
 * L8 product path (manual / later e2e):
 * 1 find → 2 filter ≤10만 → 3 top3 → 4 exclude#2 → 5 Day1 lodging
 * → 6 reflow Day1 → 7 add dinner → 8 walk≤10 → 9 indoor if rain → 10 trim long days
 */
import assert from "node:assert/strict";
import { compileWorkspaceAgentPlan } from "@/lib/context-run/compile-workspace-agent-plan";

{
  const p = compileWorkspaceAgentPlan({
    utterance: "교바시역 근처 캡슐호텔 찾아줘",
  });
  assert.equal(p.planKind, "single");
  assert.equal(p.steps.length, 1);
  assert.ok(
    p.steps[0]!.kind === "workspace_prompt" ||
      p.steps[0]!.kind === "workspace_patch",
  );
}

{
  const p = compileWorkspaceAgentPlan({
    utterance:
      "Day 2 일정 너무 빡빡한데 우메다는 빼고 오사카성 넣어줘",
  });
  assert.equal(p.planKind, "day_modify_b");
  assert.ok(p.steps.length >= 3);
  assert.ok(p.steps.some((s) => /빼|제거/u.test(s.labelKo)));
  assert.ok(p.steps.some((s) => /동선/u.test(s.labelKo)));
}

{
  const p = compileWorkspaceAgentPlan({
    utterance:
      "난바역 근처 호텔 중 15만원 이하로 하나 골라서 Day 1 숙소로 넣고, 근처 저녁 맛집도 같이 추가해줘",
  });
  assert.equal(p.planKind, "compound_c");
  assert.ok(p.steps.length >= 3);
  assert.ok(p.steps.some((s) => /호텔|숙소|선별/u.test(s.labelKo)));
  assert.ok(p.steps.some((s) => /맛집/u.test(s.labelKo)));
}

{
  const p = compileWorkspaceAgentPlan({
    utterance: "이중에서 10만원 이하만 남겨줘",
  });
  assert.equal(p.planKind, "refine_chain");
  assert.equal(p.steps.length, 1);
}

{
  const acceptance =
    "난바역 근처 호텔 찾아줘. 가성비 좋은 것 3개만 보여주고 Day 2에 넣어줘.";
  const p = compileWorkspaceAgentPlan({ utterance: acceptance });
  assert.equal(p.planKind, "scout_refine_day");
  assert.equal(p.steps.length, 4);
  assert.ok(p.steps[0]!.utterance.includes("난바역"));
  assert.match(p.steps[1]!.utterance, /3개/);
  assert.match(p.steps[2]!.utterance, /Day 2/);
  assert.match(p.steps[3]!.utterance, /동선/);
  assert.equal(p.steps[0]!.expect?.target, "lodging");
  assert.equal(p.steps[2]!.expect?.requireDay, 2);
}

/** L8 harness checklist — each line is one user turn (not one compile). */
export const L8_WORKSPACE_AGENT_HARNESS = [
  "난바역 근처 호텔 찾아줘",
  "그중 10만원 이하만 보여줘",
  "3개만 남겨줘",
  "두 번째 빼고 다시 찾아줘",
  "첫 번째 호텔을 Day 1 숙소로 넣어줘",
  "그러면 Day 1 이동 동선 다시 짜줘",
  "Day 1 저녁에 근처 맛집도 하나 넣어줘",
  "호텔에서 걸어서 10분 이내인 곳으로 바꿔줘",
  "비 오는 날이면 이 일정 실내 장소로 대체해줘",
  "전체 일정에서 하루 이동시간 1시간 넘는 날이 있으면 알아서 줄여줘",
] as const;

assert.equal(L8_WORKSPACE_AGENT_HARNESS.length, 10);

console.log(
  "ok — workspace agent plan compile (single · B · C · refine) + L8 harness scaffold",
);
