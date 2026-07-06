import { copy } from "@/lib/copy/human-ko";
import type { ContextAgentWorkPhase } from "@/lib/globe/context-agent/context-agent-work-phase";
import type { ContextAgentProcessPhase } from "@/lib/globe/context-agent/context-agent-runtime-state";
import { isContextAgentWorkPhaseBusy } from "@/lib/globe/context-agent/context-agent-work-phase";

export function resolveContextAgentWorkPhaseLabel(
  workPhase: ContextAgentWorkPhase,
  processPhase: ContextAgentProcessPhase | null,
): string {
  if (workPhase === "scouting" && processPhase) {
    switch (processPhase) {
      case "exploring":
        return copy.globe.contextAgentStatusExplore;
      case "analyzing":
        return copy.globe.contextAgentStatusAnalyze;
      case "optimizing":
        return copy.globe.contextAgentStatusPin;
      default:
        break;
    }
  }

  switch (workPhase) {
    case "briefing":
      return copy.globe.contextAgentPhaseBriefing;
    case "collecting_context":
      return copy.globe.contextAgentPhaseCollecting;
    case "scouting":
      return copy.globe.contextAgentStatusBusy;
    case "deciding":
      return copy.globe.contextAgentPhaseDeciding;
    case "awaiting_human":
      return copy.globe.contextAgentPhaseAwaitingHuman;
    case "pinned":
      return copy.globe.contextAgentPhasePinned;
    case "replanning":
      return copy.globe.contextAgentPhaseReplanning;
    case "idle":
    default:
      return copy.globe.contextAgentStatusIdle;
  }
}

export function isContextAgentSessionBusy(
  workPhase: ContextAgentWorkPhase,
  lifecycle: "idle" | "busy",
): boolean {
  return lifecycle === "busy" || isContextAgentWorkPhaseBusy(workPhase);
}
