/**
 * Verification L1 structural · L2 behavioral · L3 real-world.
 * Never claim L3 unless E2E actually ran.
 */

import type { ApplicationStateSnapshot, CompiledGoal } from "@/lib/agent-os/decision-engine/types";
import { goalSatisfied } from "@/lib/agent-os/decision-engine/goal-compiler";

export type VerificationLevel = 1 | 2 | 3;

export type LeveledVerification = {
  readonly levelReached: VerificationLevel;
  readonly structural: boolean;
  readonly behavioral: boolean;
  readonly realWorld: "ran" | "unavailable" | "skipped";
  readonly passed: boolean;
  readonly detailKo: string;
};

export function verifyGoalLevels(input: {
  readonly goal: CompiledGoal;
  readonly state: ApplicationStateSnapshot;
  readonly testsPassed: boolean | null;
  readonly browserRan: boolean;
}): LeveledVerification {
  const structural = goalSatisfied(input.goal) || input.goal.subgoals.filter((s) => s.satisfied).length > 0;
  const behavioral = input.testsPassed === true;
  const realWorld = input.browserRan ? "ran" : "unavailable";

  let levelReached: VerificationLevel = 1;
  if (input.testsPassed !== null) levelReached = 2;
  if (input.browserRan) levelReached = 3;

  const passed =
    levelReached === 3
      ? structural && behavioral && input.browserRan
      : levelReached === 2
        ? structural && behavioral
        : structural;

  return {
    levelReached,
    structural,
    behavioral,
    realWorld,
    passed,
    detailKo:
      levelReached === 3
        ? "구조 · 동작 · 브라우저 흐름까지 확인했습니다."
        : levelReached === 2
          ? behavioral
            ? "구조와 실행 테스트를 확인했습니다."
            : "실행 테스트가 아직 통과하지 않았습니다."
          : structural
            ? "구조가 준비되어 있습니다. 브라우저 테스트는 실행하지 않았습니다."
            : "아직 필요한 구조가 부족합니다.",
  };
}
