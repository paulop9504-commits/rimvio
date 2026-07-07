import { copy } from "@/lib/copy/human-ko";
import type { ContextAgentProcessPhase } from "@/lib/globe/context-agent/context-agent-runtime-state";
import type { ContextAgentWorkPhase } from "@/lib/globe/context-agent/context-agent-work-phase";
import { isContextAgentWorkPhaseBusy } from "@/lib/globe/context-agent/context-agent-work-phase";

/**
 * L2 cicada state machine — chat = brain, Globe = eyes.
 * IDLE → CLARIFYING → SEARCHING → VISUALIZING (loop on refine).
 */
export type CicadaAgentPhase = "idle" | "clarifying" | "searching" | "visualizing";

export function resolveCicadaAgentPhase(input: {
  workPhase: ContextAgentWorkPhase;
  processPhase: ContextAgentProcessPhase | null;
  lifecycle: "idle" | "busy";
  hasPendingQuestions: boolean;
  alternateSearch: boolean;
  hasGlobeResults: boolean;
}): CicadaAgentPhase {
  if (input.hasPendingQuestions || input.workPhase === "collecting_context") {
    return "clarifying";
  }

  const busy =
    input.lifecycle === "busy" || isContextAgentWorkPhaseBusy(input.workPhase);

  if (busy) {
    if (input.alternateSearch) {
      return "searching";
    }
    if (
      input.processPhase === "optimizing" ||
      input.workPhase === "deciding"
    ) {
      return "visualizing";
    }
    if (
      input.workPhase === "scouting" ||
      input.workPhase === "replanning" ||
      input.processPhase === "exploring" ||
      input.processPhase === "analyzing"
    ) {
      return "searching";
    }
  }

  if (
    input.workPhase === "awaiting_human" ||
    input.workPhase === "deciding" ||
    input.workPhase === "pinned" ||
    (input.hasGlobeResults && input.workPhase !== "idle")
  ) {
    return "visualizing";
  }

  return "idle";
}

export function resolveCicadaAgentPhaseLabel(phase: CicadaAgentPhase): string {
  switch (phase) {
    case "clarifying":
      return copy.globe.cicadaAgentPhaseClarifying;
    case "searching":
      return copy.globe.cicadaAgentPhaseSearching;
    case "visualizing":
      return copy.globe.cicadaAgentPhaseVisualizing;
    case "idle":
    default:
      return copy.globe.globeComposePipelineIdle;
  }
}
