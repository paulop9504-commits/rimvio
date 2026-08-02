/**
 * Resolve Dynamic Callout state from Object + Context + Intent + Agent.
 * Same Reality Object → different state by situation.
 */

import {
  DYNAMIC_CALLOUT_STATES,
  type DynamicCalloutInput,
  type DynamicCalloutState,
} from "@/lib/callout/dynamic/types";

export function isDynamicCalloutState(value: string): value is DynamicCalloutState {
  return (DYNAMIC_CALLOUT_STATES as readonly string[]).includes(value);
}

function intentSuggestsCompare(intent: DynamicCalloutInput["intent"]): boolean {
  if (!intent) return false;
  const a = intent.action.toLowerCase();
  const t = (intent.rawText ?? "").toLowerCase();
  return (
    a === "compare" ||
    /비교|compare|vs/iu.test(t) ||
    a.includes("compare")
  );
}

function intentSuggestsSimulate(intent: DynamicCalloutInput["intent"]): boolean {
  if (!intent) return false;
  const a = intent.action.toLowerCase();
  const t = (intent.rawText ?? "").toLowerCase();
  return (
    a === "simulate" ||
    /시뮬|what.?if|바꾸면|시뮬레이션/iu.test(t)
  );
}

function intentSuggestsPrepare(intent: DynamicCalloutInput["intent"]): boolean {
  if (!intent) return false;
  const a = intent.action.toLowerCase();
  const t = (intent.rawText ?? "").toLowerCase();
  return (
    a === "prepare" ||
    a === "create_draft" ||
    /예약\s*준비|prepare|준비해/iu.test(t)
  );
}

function intentSuggestsCommit(intent: DynamicCalloutInput["intent"]): boolean {
  if (!intent) return false;
  const t = (intent.rawText ?? "").toLowerCase();
  return /커밋|확정|지구에|commit|결제\s*확정/iu.test(t);
}

function intentSuggestsAnalyze(intent: DynamicCalloutInput["intent"]): boolean {
  if (!intent) return false;
  const a = intent.action.toLowerCase();
  const t = (intent.rawText ?? "").toLowerCase();
  return (
    a === "optimize" ||
    a === "optimize_context" ||
    a === "analyze_context" ||
    /분석|왜|이유|analyze/iu.test(t)
  );
}

/**
 * Resolve Control Surface state.
 * Priority: force → Commit handoff → Prepare → Simulate → Compare → Analyze → Agent → Discover
 */
export function resolveDynamicCalloutState(
  input: DynamicCalloutInput,
): DynamicCalloutState {
  if (input.forceState && isDynamicCalloutState(input.forceState)) {
    return input.forceState;
  }

  if (intentSuggestsCommit(input.intent)) {
    return "Commit";
  }
  if (intentSuggestsPrepare(input.intent)) {
    return "Prepare";
  }
  if (intentSuggestsSimulate(input.intent)) {
    return "Simulate";
  }
  if (intentSuggestsCompare(input.intent) || input.compare?.alternativeTitle) {
    return "Compare";
  }
  if (intentSuggestsAnalyze(input.intent)) {
    return "Analyze";
  }

  const agentPhase = input.agent?.phase?.toLowerCase() ?? "";
  if (agentPhase.includes("validate") || agentPhase.includes("draft")) {
    if (input.agent?.recommendationKo?.includes("대체")) {
      return "Compare";
    }
    return "Analyze";
  }
  if (agentPhase.includes("prepare")) {
    return "Prepare";
  }
  if (agentPhase.includes("simulate")) {
    return "Simulate";
  }

  // Default discovery surface
  return "Discover";
}
