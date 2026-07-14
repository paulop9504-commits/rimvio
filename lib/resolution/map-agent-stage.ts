import type { AgentStage } from "@/lib/intent-engine/agent-stage";
import { RESOLUTION_PHASES, type ResolutionPhase } from "@/lib/resolution/types";

/** Ordered phases for auto timeline walk (stops at execution / approval). */
export const RESOLUTION_WALK_PIPELINE: readonly ResolutionPhase[] = [
  ...RESOLUTION_PHASES,
] as const;

/**
 * Fine-grained AgentStage → Resolution phase (UI lane owner).
 */
export function resolutionPhaseForAgentStage(stage: AgentStage): ResolutionPhase | null {
  switch (stage) {
    case "IDLE":
      return null;
    case "UNDERSTAND_INTENT":
      return "intent";
    case "FIND_CONTEXT":
    case "LOAD_MEMORY":
      return "context";
    case "SEARCH":
      return "research";
    case "ANALYZE":
      return "semantic";
    case "PLAN":
      return "decision";
    case "PREPARE_TOOLS":
      return "simulation";
    case "EXECUTE":
    case "VERIFY":
      return "reality_planner";
    case "BUILD_DIFF":
    case "WAIT_APPROVAL":
    case "COMMIT":
    case "COMPLETE":
      return "execution";
    default:
      return null;
  }
}

/** Resolution phase → representative AgentStage for legacy walkers. */
export function agentStageForResolutionPhase(phase: ResolutionPhase): AgentStage {
  switch (phase) {
    case "intent":
      return "UNDERSTAND_INTENT";
    case "semantic":
      return "ANALYZE";
    case "context":
      return "FIND_CONTEXT";
    case "research":
      return "SEARCH";
    case "simulation":
      return "PREPARE_TOOLS";
    case "decision":
      return "PLAN";
    case "reality_planner":
      return "VERIFY";
    case "execution":
      return "WAIT_APPROVAL";
  }
}
