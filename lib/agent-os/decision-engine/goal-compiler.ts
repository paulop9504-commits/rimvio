/**
 * Goal Compiler — NL → verifiable Goal + subgoals + constraints.
 * Reuses understandRequest + compilePlatformGoal; does not invent tools.
 */

import { compilePlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import type { UserIntent } from "@/lib/agent/conversation/intent-types";
import type { AgentTurnUnderstand } from "@/lib/agent-os/agent-turn/types";
import type { ApplicationStateSnapshot } from "@/lib/agent-os/decision-engine/types";
import type {
  CompiledGoal,
  CompiledSubgoal,
  GoalConstraint,
  GoalCriterion,
} from "@/lib/agent-os/decision-engine/types";

const ORDER_REQUIREMENTS = [
  "restaurant_exists",
  "menu_exists",
  "cart_exists",
  "checkout_exists",
  "order_creation_exists",
  "order_persistence_exists",
] as const;

const AUTH_REQUIREMENTS = ["user_exists", "auth_exists"] as const;

function hasSignal(state: ApplicationStateSnapshot | null, needles: readonly string[]): boolean {
  if (!state) return false;
  const hay = [...state.capabilities, ...state.entities, ...state.workflows].join(" ").toLowerCase();
  return needles.some((n) => hay.includes(n.toLowerCase()));
}

function satisfied(state: ApplicationStateSnapshot | null, requirement: string): boolean {
  switch (requirement) {
    case "restaurant_exists":
      return hasSignal(state, ["restaurant", "음식점"]);
    case "menu_exists":
      return hasSignal(state, ["menu", "메뉴"]);
    case "cart_exists":
      return hasSignal(state, ["cart", "장바구니"]);
    case "checkout_exists":
      return hasSignal(state, ["checkout", "결제준비"]);
    case "order_creation_exists":
    case "order_persistence_exists":
      return hasSignal(state, ["order", "주문"]);
    case "user_exists":
    case "auth_exists":
      return hasSignal(state, ["auth", "user", "회원", "login"]);
    case "database_exists":
      return hasSignal(state, ["database", "db", "supabase", "collection"]);
    case "payment_exists":
      return hasSignal(state, ["payment", "결제", "stripe"]);
    case "tests_available":
      return (state?.tests.total ?? 0) > 0 || true;
    default:
      return false;
  }
}

export function extractConstraints(utterance: string): readonly GoalConstraint[] {
  const out: GoalConstraint[] = [];
  if (/배달|delivery/.test(utterance)) {
    out.push({ key: "delivery", value: true, source: "utterance" });
  }
  if (/수수료는?\s*없|수수료\s*0|platform_fee\s*=\s*0/.test(utterance)) {
    out.push({ key: "platform_fee", value: 0, source: "utterance" });
  }
  if (/점주.+(메뉴|수정)|merchant.+(menu|manage)/i.test(utterance)) {
    out.push({ key: "merchant_can_manage_menu", value: true, source: "utterance" });
  }
  return out;
}

export function mergeConstraints(
  current: readonly GoalConstraint[],
  incoming: readonly GoalConstraint[],
): readonly GoalConstraint[] {
  const map = new Map(current.map((c) => [c.key, c]));
  for (const next of incoming) map.set(next.key, next);
  return [...map.values()];
}

export function compileExecutableGoal(input: {
  readonly utterance: string;
  readonly understand: AgentTurnUnderstand;
  readonly state?: ApplicationStateSnapshot | null;
  readonly extraConstraints?: readonly GoalConstraint[];
}): CompiledGoal {
  const platform = compilePlatformGoal({
    utterance: input.utterance,
    intent: input.understand.intent as UserIntent,
  });
  const domain =
    input.understand.domain ??
    platform.domain ??
    (input.understand.intent === "inspect"
      ? "inspect"
      : input.understand.intent === "test"
        ? "verify"
        : "platform");

  let requirements: string[] = [];
  if (input.understand.intent === "inspect") {
    requirements = ["current_state_known"];
  } else if (input.understand.intent === "test") {
    requirements = ["tests_available"];
  } else if (input.understand.intent === "connect") {
    requirements = ["connection_ready"];
  } else if (/db|데이터베이스|database/i.test(input.utterance) && /만들|생성|create/i.test(input.utterance)) {
    requirements = ["database_exists"];
  } else if (
    domain === "delivery_marketplace" ||
    /주문|order|배달/.test(input.utterance)
  ) {
    requirements = [...ORDER_REQUIREMENTS];
    if (/회원|가입|auth|user/i.test(input.utterance)) {
      requirements = [...AUTH_REQUIREMENTS, ...requirements];
    }
  } else if (platform.requestedCapabilities.length > 0) {
    requirements = platform.requestedCapabilities.map((c) => `${c}_exists`);
  } else {
    requirements = ["requested_capability_exists"];
  }

  const subgoals: CompiledSubgoal[] = requirements.map((requirement) => ({
    id: requirement,
    requirement,
    satisfied:
      requirement === "current_state_known" ||
      requirement === "tests_available" ||
      requirement === "connection_ready"
        ? false
        : satisfied(input.state ?? null, requirement),
  }));

  const constraints = mergeConstraints(extractConstraints(input.utterance), input.extraConstraints ?? []);

  const successCriteria: GoalCriterion[] = subgoals.map((s) => ({
    id: s.id,
    labelKo: s.requirement.replace(/_/g, " "),
    required: true,
    met: s.satisfied,
  }));

  const objective =
    domain === "delivery_marketplace" || /주문/.test(input.utterance)
      ? "customer_can_complete_order"
      : input.understand.requestedOutcome;

  return {
    domain,
    objective,
    requirements,
    subgoals,
    constraints,
    successCriteria,
  };
}

export function refreshGoalAgainstState(
  goal: CompiledGoal,
  state: ApplicationStateSnapshot,
): CompiledGoal {
  const subgoals = goal.subgoals.map((s) => ({
    ...s,
    satisfied:
      s.requirement === "current_state_known"
        ? state.lines.length > 0
        : s.requirement === "tests_available"
          ? true
          : s.requirement === "connection_ready"
            ? Object.values(state.integrations).some(Boolean)
            : satisfied(state, s.requirement),
  }));
  return {
    ...goal,
    subgoals,
    successCriteria: goal.successCriteria.map((c) => ({
      ...c,
      met: subgoals.find((s) => s.id === c.id)?.satisfied ?? c.met,
    })),
  };
}

export function goalSatisfied(goal: CompiledGoal): boolean {
  const required = goal.successCriteria.filter((c) => c.required);
  return required.length > 0 && required.every((c) => c.met);
}
