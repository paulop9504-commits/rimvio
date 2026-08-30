/**
 * Capability #2 — Goal Extraction.
 * Utterance + intent → structured goal with constraints and success criteria.
 * Dev Agent OS: task kind + product decomposition (docs/RIMVIO_DEV_AGENT_OS.md).
 */

import type { UserIntent } from "@/lib/agent/conversation/intent-types";
import {
  classifyDevTask,
  decomposeProductIntent,
  type DevTaskKind,
  type ProductIntentDecomposition,
} from "@/lib/hub/dev/dev-agent-os";
import {
  compilePlatformGoal,
  type PlatformGoal,
} from "@/lib/hub/dev/platform-agent/platform-goal";

export type ExtractedConstraint = {
  readonly kind: "domain" | "flow" | "integration" | "quality" | "scope";
  readonly label: string;
  readonly value: string;
};

export type ExtractedGoal = {
  readonly platformGoal: PlatformGoal;
  readonly devTaskKind: DevTaskKind;
  readonly productDecomposition: ProductIntentDecomposition;
  readonly primaryObjective: string;
  readonly constraints: readonly ExtractedConstraint[];
  readonly successCriteria: readonly string[];
  readonly blockedReasonKo: string | null;
};

const FLOW_PATTERNS: ReadonlyArray<{ readonly pattern: RegExp; readonly flow: string }> = [
  { pattern: /검색.*예약.*결제|search.*book.*pay/i, flow: "search → book → pay" },
  { pattern: /취소.*환불|cancel.*refund/i, flow: "cancel → refund" },
  { pattern: /호텔\s*예약|hotel\s*booking/i, flow: "search → detail → booking → payment" },
];

function extractConstraints(text: string, goal: PlatformGoal): ExtractedConstraint[] {
  const out: ExtractedConstraint[] = [];
  if (goal.domain) {
    out.push({ kind: "domain", label: "domain", value: goal.domain });
  }
  for (const flow of goal.flows) {
    out.push({ kind: "flow", label: "flow", value: flow });
  }
  if (/stripe|결제/i.test(text)) {
    out.push({ kind: "integration", label: "payment", value: "stripe" });
  }
  if (/테스트|test|검증/i.test(text)) {
    out.push({ kind: "quality", label: "testing", value: "required" });
  }
  if (goal.scope.kind === "code_direct") {
    out.push({ kind: "scope", label: "mode", value: "code_direct" });
  }
  return out;
}

function extractSuccessCriteria(goal: PlatformGoal): string[] {
  const criteria: string[] = [];
  if (goal.requestedCapabilities.length) {
    criteria.push(`${goal.requestedCapabilities.length} capabilities ready`);
  }
  if (goal.domain === "hotel_booking" || goal.domain === "food_order") {
    criteria.push("End-to-end user journey runnable");
  }
  if (goal.intent === "publish") {
    criteria.push("Publish gate pass");
  }
  if (goal.intent === "test") {
    criteria.push("Sandbox tests pass");
  }
  return criteria;
}

/** Formal goal extraction — wraps compilePlatformGoal with structured metadata. */
export function extractStructuredGoal(input: {
  readonly utterance: string;
  readonly intent: UserIntent;
  readonly platformName?: string | null;
}): ExtractedGoal {
  const text = input.utterance.trim();
  const devTask = classifyDevTask(text);
  const productDecomposition = decomposeProductIntent({ utterance: text });
  let platformGoal = compilePlatformGoal({
    utterance: text,
    intent: devTask.userIntent === "question" || devTask.userIntent === "chat" ? input.intent : devTask.userIntent,
    platformName: input.platformName,
  });

  for (const { pattern, flow } of FLOW_PATTERNS) {
    if (pattern.test(text) && platformGoal.flows.length === 0) {
      platformGoal = { ...platformGoal, flows: [flow] };
    }
  }

  const constraints = extractConstraints(text, platformGoal);
  const successCriteria = extractSuccessCriteria(platformGoal);

  return {
    platformGoal,
    devTaskKind: devTask.taskKind,
    productDecomposition,
    primaryObjective: platformGoal.summaryKo,
    constraints,
    successCriteria,
    blockedReasonKo: platformGoal.ready ? null : platformGoal.clarificationKo,
  };
}
