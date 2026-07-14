/**
 * Intent / Agent execution stages — Cursor-style progress SSOT.
 * Never execute Reality from stage alone; WAIT_APPROVAL → human Commit.
 */

export const AGENT_STAGES = [
  "IDLE",
  "UNDERSTAND_INTENT",
  "FIND_CONTEXT",
  "LOAD_MEMORY",
  "SEARCH",
  "ANALYZE",
  "PLAN",
  "PREPARE_TOOLS",
  "EXECUTE",
  "VERIFY",
  "BUILD_DIFF",
  "WAIT_APPROVAL",
  "COMMIT",
  "COMPLETE",
] as const;

export type AgentStage = (typeof AGENT_STAGES)[number];

/** UI lanes for Execution Timeline (not raw stage dump). */
export const EXECUTION_LANES = [
  "intent",
  "context",
  "analysis",
  "planner",
  "agent",
  "reality_diff",
] as const;

export type ExecutionLaneId = (typeof EXECUTION_LANES)[number];

export type ExecutionLaneStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "waiting";

export type IntentExecutionProfile = "trip_revise" | "generic";

/** Ordered active pipeline for a profile (IDLE omitted). */
export const TRIP_REVISE_STAGE_PIPELINE: readonly AgentStage[] = [
  "UNDERSTAND_INTENT",
  "FIND_CONTEXT",
  "LOAD_MEMORY",
  "SEARCH",
  "ANALYZE",
  "PLAN",
  "PREPARE_TOOLS",
  "EXECUTE",
  "VERIFY",
  "BUILD_DIFF",
  "WAIT_APPROVAL",
] as const;

/** Stages that may auto-advance without human (stops before COMMIT). */
export const AUTO_ADVANCE_UNTIL_STAGE: AgentStage = "WAIT_APPROVAL";

export function stageIndex(stage: AgentStage): number {
  return AGENT_STAGES.indexOf(stage);
}

export function isAgentStage(value: string): value is AgentStage {
  return (AGENT_STAGES as readonly string[]).includes(value);
}

export function laneForStage(stage: AgentStage): ExecutionLaneId | null {
  switch (stage) {
    case "IDLE":
      return null;
    case "UNDERSTAND_INTENT":
      return "intent";
    case "FIND_CONTEXT":
    case "LOAD_MEMORY":
      return "context";
    case "SEARCH":
    case "ANALYZE":
      return "analysis";
    case "PLAN":
      return "planner";
    case "PREPARE_TOOLS":
    case "EXECUTE":
    case "VERIFY":
      return "agent";
    case "BUILD_DIFF":
    case "WAIT_APPROVAL":
    case "COMMIT":
      return "reality_diff";
    case "COMPLETE":
      return "reality_diff";
    default:
      return null;
  }
}

export function stagesForLane(lane: ExecutionLaneId): readonly AgentStage[] {
  switch (lane) {
    case "intent":
      return ["UNDERSTAND_INTENT"];
    case "context":
      return ["FIND_CONTEXT", "LOAD_MEMORY"];
    case "analysis":
      return ["SEARCH", "ANALYZE"];
    case "planner":
      return ["PLAN"];
    case "agent":
      return ["PREPARE_TOOLS", "EXECUTE", "VERIFY"];
    case "reality_diff":
      return ["BUILD_DIFF", "WAIT_APPROVAL", "COMMIT", "COMPLETE"];
  }
}

export function nextStageInPipeline(
  pipeline: readonly AgentStage[],
  current: AgentStage,
): AgentStage | null {
  const idx = pipeline.indexOf(current);
  if (idx < 0) {
    return pipeline[0] ?? null;
  }
  return pipeline[idx + 1] ?? null;
}
