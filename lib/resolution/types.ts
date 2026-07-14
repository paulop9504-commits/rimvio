/**
 * Rimvio Resolution Pipeline — NL → Reality gate.
 * Constitution: Intent never mutates Reality; Execution never decides; humans Commit.
 *
 * Natural Language
 *   → Intent Resolution
 *   → Semantic Resolution
 *   → Context Resolution
 *   → Research Resolution
 *   → Simulation Resolution
 *   → Decision Resolution
 *   → Reality Planner
 *   → Execution (stops at approval)
 */

export const RESOLUTION_PHASES = [
  "intent",
  "semantic",
  "context",
  "research",
  "simulation",
  "decision",
  "reality_planner",
  "execution",
] as const;

export type ResolutionPhase = (typeof RESOLUTION_PHASES)[number];

export type ResolutionPhaseStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "waiting"
  | "skipped";

export type ResolutionIntentReport = {
  /** Closed job categories inferred. */
  categories: string[];
  libraryIds: string[];
  goalSummaryKo: string;
  confidence: number;
};

export type ResolutionSemanticReport = {
  moods: string[];
  styles: string[];
  profile: Record<string, number | string>;
  blendNotes: string[];
};

export type ResolutionContextReport = {
  contextEventId: string | null;
  destinationLabel: string | null;
  companionMode: string | null;
  hasActivePlan: boolean;
  missing: string[];
};

export type ResolutionResearchItem = {
  id: string;
  labelKo: string;
  engineId: string | null;
  reasonKo: string;
};

export type ResolutionSimulationStep = {
  id: string;
  labelKo: string;
  /** Virtual only — never a Reality mutation. */
  outcome: "would_prepare" | "would_ask" | "would_block";
};

export type ResolutionDecisionReport = {
  primaryPath: string;
  lodgingPriority: string | null;
  foodBias: string | null;
  tripStyle: string | null;
  rationaleKo: string;
};

export type ResolutionPlanStep = {
  id: string;
  labelKo: string;
  requiresHuman: boolean;
};

export type ResolutionExecutionGate = {
  status: "ready" | "waiting_approval" | "blocked";
  nextActionKo: string;
  canAutoRun: boolean;
};

export type ResolutionPhaseResult<T> = {
  phase: ResolutionPhase;
  status: ResolutionPhaseStatus;
  progressKo: string;
  data: T;
};

export type ResolutionBundle = {
  version: 1;
  sourceText: string;
  currentPhase: ResolutionPhase;
  phases: {
    intent: ResolutionPhaseResult<ResolutionIntentReport>;
    semantic: ResolutionPhaseResult<ResolutionSemanticReport>;
    context: ResolutionPhaseResult<ResolutionContextReport>;
    research: ResolutionPhaseResult<ResolutionResearchItem[]>;
    simulation: ResolutionPhaseResult<ResolutionSimulationStep[]>;
    decision: ResolutionPhaseResult<ResolutionDecisionReport>;
    reality_planner: ResolutionPhaseResult<ResolutionPlanStep[]>;
    execution: ResolutionPhaseResult<ResolutionExecutionGate>;
  };
  /** Overall confidence after Decision. */
  confidence: number;
  waitingApproval: boolean;
};

export type ResolutionPipelineInput = {
  text: string;
  contextEventId?: string | null;
  destinationLabel?: string | null;
  companionMode?: string | null;
  hasActivePlan?: boolean;
  /** Prefer stamped IntentBlueprint when present. */
  blueprint?: import("@/lib/intent-engine/types").IntentBlueprint | null;
};
