export {
  RULE_ENGINE_VERSION,
  INTENT_FAMILIES,
  TOOL_FAMILIES,
  PROMPT_CONSTITUTION,
  ORCHESTRATION_PRIORITY,
  RULE_ENGINE_MANIFEST,
  COMMIT_REQUIRED_INTENTS,
  SOFT_CONFIRM_INTENTS,
  GRAPH_MUTATING_INTENTS,
  type IntentFamily,
  type ToolFamily,
  type RuleId,
} from "@/lib/rule-engine/constitution";
export { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
export { routeToolFamily } from "@/lib/rule-engine/route-tool-family";
export {
  resolveToolIdForIntent,
  resolveLookupToolId,
  resolvePlannerLookupDomain,
  type PlannerLookupDomain,
} from "@/lib/rule-engine/resolve-tool-id";

export {
  resolveClarifyLess,
  pickFirstCandidate,
  type ClarifyCandidate,
  type ClarifyLessChip,
  type ClarifyLessResult,
} from "@/lib/rule-engine/clarify-less";
export {
  writeClarifyLessPending,
  readClarifyLessPending,
  clearClarifyLessPending,
  buildClarifyResumeUtterance,
  type ClarifyLessPending,
} from "@/lib/rule-engine/clarify-less-pending-store";
export {
  evaluateUtteranceRules,
  shouldFreezeFreeNlLlm,
  type RuleEngineDecision,
} from "@/lib/rule-engine/evaluate-utterance-rules";
export {
  gateRuleDecisionForExecution,
  ruleRequiresFieldCommit,
  type RuleExecutionGate,
} from "@/lib/rule-engine/gate-rule-execution";
export {
  isActionFirstUtterance,
  ACTION_FIRST_INTENTS,
} from "@/lib/rule-engine/is-action-first-utterance";
export {
  tryRunSoftSurfaceCommand,
  type SoftCommandResult,
} from "@/lib/rule-engine/try-run-soft-surface-command";
