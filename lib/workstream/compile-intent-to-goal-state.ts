/**
 * Intent Compiler → goal_state (ADR-042 priority #3).
 * Utterance must become intent · conditions · constraints · goal_state — not raw execute.
 * Extends Context Compiler IR; does not fork NL_PIPELINE_STAGES.
 */

import { compileContextFromUtterance } from "@/lib/context-compiler/compile-context-from-utterance";
import type { ContextCompilerIrV1 } from "@/lib/context-compiler/types";
import type { ContextWorkSlotId } from "@/lib/workstream/context-work-state";

export type IntentGoalState = {
  readonly goalId: string;
  readonly goalKo: string;
  readonly intentFamily: string;
  readonly conditions: readonly string[];
  readonly constraints: {
    readonly maxWalkMinutes: number | null;
    readonly budget: string | number | null;
    readonly crowdAvoidance: number;
    readonly companion: string | null;
  };
  readonly entities: readonly string[];
  readonly pendingSlots: readonly ContextWorkSlotId[];
  readonly confirmedHints: readonly ContextWorkSlotId[];
  readonly ir: ContextCompilerIrV1;
};

const TRAVEL_PENDING: ContextWorkSlotId[] = [
  "destination",
  "dates",
  "lodging",
  "route",
  "flight",
  "food",
];

/**
 * Compile natural language into an executable Goal State for Agent Brain.
 */
export function compileIntentToGoalState(input: {
  readonly utterance: string;
  readonly ir?: ContextCompilerIrV1 | null;
}): IntentGoalState {
  const utterance = input.utterance.trim();
  const ir =
    input.ir ??
    compileContextFromUtterance({
      utterance,
    });

  const goalKo =
    ir.intent.goalKo?.trim() ||
    (ir.intent.family === "Create" ? "여행 준비 완료" : "목표 완료");

  const conditions: string[] = [];
  if (ir.time.durationDays != null) {
    conditions.push(`${ir.time.durationDays}일 일정`);
  }
  if (ir.time.dateIso) {
    conditions.push(`시작 ${ir.time.dateIso.slice(0, 10)}`);
  }
  if (ir.time.participants) {
    conditions.push(`동행 ${ir.time.participants}`);
  }
  for (const h of ir.intent.hiddenKo.slice(0, 3)) {
    conditions.push(h);
  }

  const entities = ir.entities.map((e) => e.value).filter(Boolean);
  const hasPlace = ir.entities.some(
    (e) => e.type === "location" || e.type === "place",
  );
  const travelLike =
    /여행|trip|travel|오사카|도쿄|제주|놀러/i.test(utterance) ||
    goalKo.includes("여행");

  const confirmedHints: ContextWorkSlotId[] = [];
  if (hasPlace) confirmedHints.push("destination");
  if (ir.time.dateIso || ir.time.durationDays) confirmedHints.push("dates");

  const pendingSlots: ContextWorkSlotId[] = travelLike
    ? TRAVEL_PENDING.filter((s) => !confirmedHints.includes(s))
    : [];

  return {
    goalId: `goal:${ir.intent.family}:${entities[0] ?? "generic"}`,
    goalKo,
    intentFamily: ir.intent.family,
    conditions,
    constraints: {
      maxWalkMinutes: ir.constraints.maxWalkMinutes,
      budget: ir.constraints.budget,
      crowdAvoidance: ir.preference.crowdAvoidance,
      companion: ir.constraints.companion,
    },
    entities,
    pendingSlots,
    confirmedHints,
    ir,
  };
}
