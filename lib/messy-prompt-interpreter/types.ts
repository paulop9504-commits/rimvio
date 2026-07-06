/** Messy Prompt Interpreter — NL → IR → execution / visualization. */

export type MessyPromptDomain =
  | "travel_planning"
  | "lodging"
  | "eatery"
  | "schedule"
  | "navigation"
  | "coding_task"
  | "general";

export type MessyPromptObjective =
  | "minimize_risk"
  | "maximize_efficiency"
  | "reduce_cost"
  | "find_nearby"
  | "fix_problem"
  | "plan_sequence"
  | "clarify_and_act"
  | "unknown";

export type MessyPromptUrgency = "low" | "medium" | "high";

/** Step 1 output — semantic variables before IR assembly. */
export type ExtractedMessyIntent = {
  raw: string;
  normalized: string;
  domain: MessyPromptDomain;
  objective: MessyPromptObjective;
  taskLabelKo: string;
  goalKo: string;
  constraints: string[];
  preferences: string[];
  entities: string[];
  stateHints: Record<string, string | number | boolean>;
  urgency: MessyPromptUrgency;
  confidence: number;
  assumptions: string[];
  ambiguities: string[];
};

/** Step 2 — system language / intermediate representation. */
export type MessyPromptIR = {
  version: 1;
  domain: MessyPromptDomain;
  objective: MessyPromptObjective;
  summaryKo: string;
  professionalRewriteKo: string;
  state: Record<string, string | number | boolean | null>;
  constraints: string[];
  optimizationGoals: string[];
  preferences: string[];
  entities: string[];
  confidence: number;
  assumptions: string[];
};

export type ClarificationQuestion = {
  id: string;
  promptKo: string;
  /** When true, execution may proceed with a default anyway. */
  optional: boolean;
};

export type ExecutionPlanStep = {
  id: string;
  order: number;
  labelKo: string;
  kind: "gather" | "decide" | "act" | "verify" | "render";
  detailKo?: string;
};

export type ExecutionPlan = {
  titleKo: string;
  understandingKo: string;
  steps: ExecutionPlanStep[];
};

export type VisualizationNode = {
  id: string;
  labelKo: string;
  kind: "start" | "action" | "decision" | "end";
};

export type VisualizationEdge = {
  from: string;
  to: string;
  labelKo?: string;
};

/** Step 4 — UI-ready projection of the plan. */
export type InterpreterVisualization = {
  timeline: Array<{ timeLabel: string; titleKo: string; detailKo?: string }>;
  graph: {
    nodes: VisualizationNode[];
    edges: VisualizationEdge[];
  };
  cards: Array<{ titleKo: string; bodyKo: string; emphasis?: "primary" | "muted" }>;
};

export type InterpreterExecutionResult = {
  executorId: string;
  status: "done" | "skipped" | "needs_input";
  outputKo: string;
  payload?: Record<string, unknown>;
};

export type InterpreterExecutionContext = {
  messyInput: string;
  intent: ExtractedMessyIntent;
  ir: MessyPromptIR;
  plan: ExecutionPlan;
};

export type InterpreterExecutor = {
  id: string;
  canExecute: (ir: MessyPromptIR) => boolean;
  execute: (ctx: InterpreterExecutionContext) => Promise<InterpreterExecutionResult>;
};

export type InterpretSource = "rules" | "llm" | "hybrid";

export type InterpretAndExecuteOptions = {
  /** Prefer LLM refinement when OpenAI is configured. Default true. */
  useLlm?: boolean;
  /** External situation hints merged into state. */
  situation?: Record<string, string | number | boolean | null>;
  /** Custom executors — first match wins. */
  executors?: InterpreterExecutor[];
  /** Skip execution; return plan + visualization only. */
  dryRun?: boolean;
  clock?: Date;
};

export type InterpretAndExecuteResult = {
  messyInput: string;
  normalizedInput: string;
  source: InterpretSource;
  intent: ExtractedMessyIntent;
  ir: MessyPromptIR;
  plan: ExecutionPlan;
  clarifications: ClarificationQuestion[];
  visualization: InterpreterVisualization;
  execution: InterpreterExecutionResult | null;
};

export type MessyPromptExtractInput = {
  message: string;
  situation?: Record<string, string | number | boolean | null>;
  clock?: Date;
};
