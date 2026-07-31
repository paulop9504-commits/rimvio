/**
 * Natural Language Pipeline — canonical stage order SSOT.
 * Cursor-for-Reality: structure meaning before LLM, manage execution after.
 *
 * @see docs/RIMVIO_CORE_ARCHITECTURE.md · docs/adr/013-cursor-rimvio-isomorphism.md · docs/adr/021-cursor-os-spine-ssot.md
 */

export const NL_PIPELINE_STAGES = [
  "context_builder",
  "rule_constitution",
  "entity_resolver",
  "intent_parser",
  "action_planner",
  "tool_router",
  "graph_command_ir",
  "graph_engine",
  "agent_runtime",
  "reality_commit",
  "reality_graph",
] as const;

export type NlPipelineStage = (typeof NL_PIPELINE_STAGES)[number];

export type NlPipelineStageMeta = {
  readonly stage: NlPipelineStage;
  readonly labelKo: string;
  readonly wire: string;
  /** LLM may run only at reasoning-eligible stages. */
  readonly llmEligible: boolean;
  /** Mutates Reality — requires human Commit before this stage completes. */
  readonly mutatesReality: boolean;
};

export const NL_PIPELINE_MANIFEST: readonly NlPipelineStageMeta[] = [
  {
    stage: "context_builder",
    labelKo: "맥락 패킹",
    wire: "lib/context-builder",
    llmEligible: false,
    mutatesReality: false,
  },
  {
    stage: "rule_constitution",
    labelKo: "규칙 평가",
    wire: "lib/rule-engine",
    llmEligible: false,
    mutatesReality: false,
  },
  {
    stage: "entity_resolver",
    labelKo: "엔티티 해석",
    wire: "lib/entity-resolver · lib/action-planner/resolve-plan-entity · lib/graph-command/resolve-graph-entity",
    llmEligible: false,
    mutatesReality: false,
  },
  {
    stage: "intent_parser",
    labelKo: "의도 분류",
    wire: "lib/intent-router · lib/intent-router/build-intent-plan · lib/rule-engine/classify-intent-family · lib/graph-command/parse-graph-commands",
    llmEligible: false,
    mutatesReality: false,
  },
  {
    stage: "action_planner",
    labelKo: "실행 계획",
    wire: "lib/action-planner · lib/context-run/run-natural-language-pipeline",
    // Reasoning may run here only for Analyze/Predict plan steps.
    llmEligible: true,
    mutatesReality: false,
  },
  {
    stage: "tool_router",
    labelKo: "도구 라우팅",
    wire: "lib/rule-engine/resolve-tool-id · lib/tool-registry",
    llmEligible: false,
    mutatesReality: false,
  },
  {
    stage: "graph_command_ir",
    labelKo: "그래프 명령",
    wire: "lib/graph-command/types",
    llmEligible: false,
    mutatesReality: false,
  },
  {
    stage: "graph_engine",
    labelKo: "그래프 수정",
    wire: "lib/graph-command/apply-graph-commands",
    llmEligible: false,
    mutatesReality: false,
  },
  {
    stage: "agent_runtime",
    labelKo: "에이전트 준비",
    wire: "lib/agent-runtime/run-booking-prepare-agent · lib/booking-runtime",
    llmEligible: false,
    mutatesReality: false,
  },
  {
    stage: "reality_commit",
    labelKo: "현실 반영",
    wire: "lib/reality-commit · Field queue handoff (wait_commit)",
    llmEligible: false,
    mutatesReality: true,
  },
  {
    stage: "reality_graph",
    labelKo: "현실 그래프",
    wire: "lib/graph-command/session-graph-store · lib/reality-pipeline",
    llmEligible: false,
    mutatesReality: false,
  },
];

export function nlPipelineStageMeta(
  stage: NlPipelineStage,
): NlPipelineStageMeta {
  const meta = NL_PIPELINE_MANIFEST.find((row) => row.stage === stage);
  if (!meta) {
    throw new Error(`unknown NL pipeline stage: ${stage}`);
  }
  return meta;
}

/** Stages where the LLM co-processor is permitted (reasoning only). */
export function llmEligibleStages(): readonly NlPipelineStage[] {
  return NL_PIPELINE_MANIFEST.filter((row) => row.llmEligible).map(
    (row) => row.stage,
  );
}

/** Stages that require a human Commit gate before completing. */
export function realityMutatingStages(): readonly NlPipelineStage[] {
  return NL_PIPELINE_MANIFEST.filter((row) => row.mutatesReality).map(
    (row) => row.stage,
  );
}
