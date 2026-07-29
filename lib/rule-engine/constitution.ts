/**
 * Rule Engine — Prompt Constitution as code.
 * Priority: Context First → Graph First → Action First → Reason Later.
 * LLM is inference-only; never the default for resolvable Actions.
 *
 * @see docs/adr/012-rule-engine-constitution.md
 */

export const RULE_ENGINE_VERSION = 1 as const;

/** Intent Grammar — first-pass classification families. */
export const INTENT_FAMILIES = [
  "Search",
  "Compare",
  "Move",
  "Pin",
  "Delete",
  "Create",
  "Revise",
  "Reserve",
  "Purchase",
  "Filter",
  "Share",
  "Navigate",
  "Predict",
  "Simulate",
  "Analyze",
  "Group",
  "Ungroup",
  "Highlight",
  "Note",
  "Calendar",
  "Prepare",
  "Unknown",
] as const;

export type IntentFamily = (typeof INTENT_FAMILIES)[number];

/** Tool families after Intent resolves. */
export const TOOL_FAMILIES = [
  "maps",
  "booking",
  "graph",
  "payment",
  "calendar",
  "ranking",
  "none",
] as const;

export type ToolFamily = (typeof TOOL_FAMILIES)[number];

/**
 * Prompt Constitution — subordinate to Article 0; above free-form system prompts.
 */
export const PROMPT_CONSTITUTION = [
  "Always understand Context before answering.",
  "Always resolve entities before reasoning.",
  "Never answer if an Action can be executed.",
  "Prefer editing the Graph over generating text.",
  "Ask at most one clarification.",
  "Never modify Reality without Commit.",
  "Use tools whenever possible.",
  "Preserve Context continuity.",
  "Every Action updates the Ontology Graph.",
  "Every execution is reversible.",
] as const;

/** Product stack order — never invert. Reality state outranks graph edits. */
export const ORCHESTRATION_PRIORITY = [
  "Context First",
  "Reality First",
  "Graph First",
  "Action First",
  "Reason Later",
] as const;

export type RuleId =
  | "R1_ActionFirst"
  | "R2_EntityFirst"
  | "R3_ContextFirst"
  | "R4_ClarifyLess"
  | "R5_ToolsFirst"
  | "R6_GraphMutates"
  | "R7_CommitGate";

export const RULE_ENGINE_MANIFEST: readonly {
  readonly id: RuleId;
  readonly titleEn: string;
  readonly summaryKo: string;
}[] = [
  {
    id: "R1_ActionFirst",
    titleEn: "Action First",
    summaryKo: "답변보다 Action IR을 먼저 찾는다",
  },
  {
    id: "R2_EntityFirst",
    titleEn: "Entity First",
    summaryKo: "추론 전에 Entity를 해석한다",
  },
  {
    id: "R3_ContextFirst",
    titleEn: "Context First",
    summaryKo: "선택·활성 맥락을 먼저 본다",
  },
  {
    id: "R4_ClarifyLess",
    titleEn: "Clarify Less",
    summaryKo: "질문은 최대 한 번 · 후보 하나면 바로 실행",
  },
  {
    id: "R5_ToolsFirst",
    titleEn: "Tools First",
    summaryKo: "검색·예약·지도·캘린더를 문장보다 먼저",
  },
  {
    id: "R6_GraphMutates",
    titleEn: "Graph Mutates",
    summaryKo: "Action은 세션 그래프를 수정한다",
  },
  {
    id: "R7_CommitGate",
    titleEn: "Commit Gate",
    summaryKo: "위험 Action은 Preview→승인→실행",
  },
];

/** Intents that may mutate Reality only after Field Commit (dangerous). */
export const COMMIT_REQUIRED_INTENTS: ReadonlySet<IntentFamily> = new Set([
  "Reserve",
  "Purchase",
]);

/**
 * Session-graph / condition edits — soft confirm chips (not Field).
 * Stay revise uses the same chip surface via Revise Intent.
 */
export const SOFT_CONFIRM_INTENTS: ReadonlySet<IntentFamily> = new Set([
  "Revise",
  "Filter",
  "Pin",
  "Delete",
  "Share",
]);

/** Graph-side intents (session graph only — prepare / project). */
export const GRAPH_MUTATING_INTENTS: ReadonlySet<IntentFamily> = new Set([
  "Pin",
  "Compare",
  "Delete",
  "Move",
  "Revise",
  "Filter",
  "Group",
  "Ungroup",
  "Highlight",
  "Note",
  "Share",
  "Simulate",
  "Create",
  "Search",
  "Reserve",
]);

/** Action Ontology — re-exported for constitution-level access. */
export { ACTION_VERBS } from "@/lib/rimvio-command/action-verb";
export type { ActionVerb } from "@/lib/rimvio-command/action-verb";
export { COMMAND_TARGETS } from "@/lib/rimvio-command/resolve-command-target";
export type { CommandTarget } from "@/lib/rimvio-command/resolve-command-target";
