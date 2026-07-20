/**
 * Evaluate utterance against Rule Engine — gate before free-NL LLM.
 */

import {
  COMMIT_REQUIRED_INTENTS,
  GRAPH_MUTATING_INTENTS,
  ORCHESTRATION_PRIORITY,
  PROMPT_CONSTITUTION,
  SOFT_CONFIRM_INTENTS,
  type IntentFamily,
  type RuleId,
  type ToolFamily,
} from "@/lib/rule-engine/constitution";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import {
  pickFirstCandidate,
  resolveClarifyLess,
  type ClarifyCandidate,
  type ClarifyLessResult,
} from "@/lib/rule-engine/clarify-less";
import { routeToolFamily } from "@/lib/rule-engine/route-tool-family";
import { isGraphCommandUtterance } from "@/lib/graph-command/parse-graph-commands";
import type { SessionGraphV1 } from "@/lib/graph-command/types";

/** Compound compare→reserve — Action Planner path (not a single Graph Command). */
function isCompoundCompareReserveUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) {
    return false;
  }
  return /비교|compare|vs/iu.test(text) && /예약|reserve|booking/iu.test(text);
}

export type RuleEngineDecision = {
  readonly version: 1;
  readonly utterance: string;
  readonly intent: IntentFamily;
  readonly toolFamily: ToolFamily;
  /** Matched deterministic Graph Command path — do not open free-NL LLM. */
  readonly actionMatched: boolean;
  /** Prefer graph/tool execution over text. */
  readonly preferActionOverText: boolean;
  /** Reality-dangerous — Field Commit after prepare ops. */
  readonly requiresCommit: boolean;
  /** Condition edit — soft confirm chips (not Field). */
  readonly requiresSoftConfirm: boolean;
  readonly mutatesGraph: boolean;
  /** Only when Intent is Analyze/Predict/Unknown and no Action matched. */
  readonly allowLlmReasoning: boolean;
  readonly clarify: ClarifyLessResult | null;
  readonly firedRules: readonly RuleId[];
  readonly priority: typeof ORCHESTRATION_PRIORITY;
  readonly constitution: typeof PROMPT_CONSTITUTION;
  readonly assistantHintKo: string;
};

function selectionCandidates(graph: SessionGraphV1 | null): ClarifyCandidate[] {
  if (!graph) {
    return [];
  }
  const fromSelection = graph.selectionIds
    .map((id) => graph.nodes.find((n) => n.id === id))
    .filter(Boolean)
    .map((n) => ({ id: n!.id, labelKo: n!.labelKo }));
  if (fromSelection.length > 0) {
    return fromSelection;
  }
  return graph.nodes
    .filter(
      (n) =>
        n.visible &&
        (n.kind === "lodging" || n.kind === "eatery" || n.kind === "poi"),
    )
    .map((n) => ({ id: n.id, labelKo: n.labelKo }));
}

/**
 * Core gate: structure meaning before LLM.
 */
export function evaluateUtteranceRules(input: {
  readonly utterance: string;
  readonly graph?: SessionGraphV1 | null;
}): RuleEngineDecision {
  const utterance = input.utterance.trim();
  const graph = input.graph ?? null;
  const intent = classifyIntentFamily(utterance);
  const toolFamily = routeToolFamily(intent);
  const actionMatched =
    isGraphCommandUtterance(utterance, graph) ||
    isCompoundCompareReserveUtterance(utterance) ||
    intent === "Revise";
  const requiresCommit =
    COMMIT_REQUIRED_INTENTS.has(intent) ||
    isCompoundCompareReserveUtterance(utterance);
  const requiresSoftConfirm =
    !requiresCommit && SOFT_CONFIRM_INTENTS.has(intent);
  const mutatesGraph =
    GRAPH_MUTATING_INTENTS.has(intent) ||
    isCompoundCompareReserveUtterance(utterance);

  const fired: RuleId[] = ["R1_ActionFirst", "R2_EntityFirst", "R3_ContextFirst"];

  let clarify: ClarifyLessResult | null = null;
  if (intent === "Reserve" || intent === "Delete" || intent === "Share") {
    fired.push("R4_ClarifyLess");
    const candidates = selectionCandidates(graph);
    const ordinal =
      /첫\s*(?:번\s*)?째|첫번째|first/iu.test(utterance) && candidates[0]
        ? pickFirstCandidate(candidates)
        : graph?.selectionIds[0]
          ? candidates.find((c) => c.id === graph.selectionIds[0]) ?? null
          : null;
    clarify = resolveClarifyLess({
      intentLabelKo:
        intent === "Reserve" ? "예약" : intent === "Delete" ? "삭제" : "공유",
      candidates,
      alreadyResolved: ordinal,
    });
  }

  if (toolFamily !== "none") {
    fired.push("R5_ToolsFirst");
  }
  if (mutatesGraph) {
    fired.push("R6_GraphMutates");
  }
  if (requiresCommit) {
    fired.push("R7_CommitGate");
  }

  const allowLlmReasoning =
    !actionMatched &&
    (intent === "Analyze" || intent === "Predict" || intent === "Unknown");

  const preferActionOverText = actionMatched || mutatesGraph || toolFamily !== "none";

  let assistantHintKo = "맥락과 그래프를 먼저 봤어요";
  if (actionMatched) {
    assistantHintKo = requiresSoftConfirm
      ? "확인 후 반영할게요"
      : "바로 실행할 수 있어요";
  } else if (clarify?.kind === "clarify") {
    assistantHintKo = clarify.questionKo;
  } else if (clarify?.kind === "execute") {
    assistantHintKo = clarify.reasonKo;
  } else if (allowLlmReasoning) {
    assistantHintKo = "필요할 때만 추론해요";
  }

  return {
    version: 1,
    utterance,
    intent,
    toolFamily,
    actionMatched,
    preferActionOverText,
    requiresCommit,
    requiresSoftConfirm,
    mutatesGraph,
    allowLlmReasoning,
    clarify,
    firedRules: fired,
    priority: ORCHESTRATION_PRIORITY,
    constitution: PROMPT_CONSTITUTION,
    assistantHintKo,
  };
}

/** True when free-NL LLM chat should stay frozen. */
export function shouldFreezeFreeNlLlm(decision: RuleEngineDecision): boolean {
  return decision.actionMatched || decision.preferActionOverText;
}
