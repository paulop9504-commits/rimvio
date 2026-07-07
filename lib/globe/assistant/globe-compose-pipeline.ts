import { copy } from "@/lib/copy/human-ko";
import type { ContextAgentProcessPhase } from "@/lib/globe/context-agent/context-agent-runtime-state";
import type { ContextAgentWorkPhase } from "@/lib/globe/context-agent/context-agent-work-phase";
import { isContextAgentWorkPhaseBusy } from "@/lib/globe/context-agent/context-agent-work-phase";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";

/** Cursor-style: talk → interpret → apply globe → verify */
export type GlobeComposePipelinePhase =
  | "idle"
  | "ingest"
  | "interpret"
  | "apply_globe"
  | "verify";

export function resolveGlobeComposePipelineLabel(
  phase: GlobeComposePipelinePhase,
): string {
  switch (phase) {
    case "ingest":
      return copy.globe.globeComposePipelineIngest;
    case "interpret":
      return copy.globe.globeComposePipelineInterpret;
    case "apply_globe":
      return copy.globe.globeComposePipelineApplyGlobe;
    case "verify":
      return copy.globe.globeComposePipelineVerify;
    case "idle":
    default:
      return copy.globe.globeComposePipelineIdle;
  }
}

export function resolveContextAgentPipelinePhase(input: {
  workPhase: ContextAgentWorkPhase;
  processPhase: ContextAgentProcessPhase | null;
  lifecycle: "idle" | "busy";
}): GlobeComposePipelinePhase {
  if (input.lifecycle === "busy" || isContextAgentWorkPhaseBusy(input.workPhase)) {
    if (input.workPhase === "scouting" && input.processPhase === "optimizing") {
      return "apply_globe";
    }
    if (
      input.workPhase === "scouting" ||
      input.workPhase === "replanning" ||
      input.processPhase === "exploring" ||
      input.processPhase === "analyzing"
    ) {
      return "interpret";
    }
    if (input.workPhase === "deciding" || input.workPhase === "awaiting_human") {
      return "verify";
    }
    if (input.workPhase === "pinned") {
      return "idle";
    }
    return "interpret";
  }

  if (input.workPhase === "briefing" || input.workPhase === "collecting_context") {
    return "ingest";
  }
  if (input.workPhase === "awaiting_human" || input.workPhase === "deciding") {
    return "verify";
  }
  return "idle";
}

export function resolveGlobeChatPipelinePhase(
  composeState: PortalComposeRunState | null,
): GlobeComposePipelinePhase {
  if (!composeState) {
    return "idle";
  }

  if (composeState.status === "ready") {
    return "verify";
  }
  if (composeState.status === "drafting") {
    return "apply_globe";
  }
  if (
    composeState.status === "waiting_slot" ||
    composeState.pendingClarifyKind ||
    composeState.pendingSlotId
  ) {
    return "interpret";
  }
  if (composeState.status === "conversing") {
    return composeState.accumulatedText.trim() ? "interpret" : "ingest";
  }
  return "idle";
}
