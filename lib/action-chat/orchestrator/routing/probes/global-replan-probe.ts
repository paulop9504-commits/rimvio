import {
  isGlobalReplanInput,
  orchestrateGlobalReplan,
} from "@/lib/action-chat/routing-patches/scheduling-global-replan";
import type { PrePipelineProbe } from "@/lib/action-chat/orchestrator/routing/pre-pipeline-probe-types";

/** Tier 4 — PATCH3 scheduling override. */
export const globalReplanProbe: PrePipelineProbe = async (base) => {
  if (!isGlobalReplanInput(base.message)) {
    return null;
  }
  const replan = orchestrateGlobalReplan({
    message: base.message,
    referenceDate: base.context.currentDate,
    existingSchedule: base.context.existingSchedule ?? [],
  });
  return {
    tier: 4,
    label: "GlobalReplan",
    detail: "PATCH3_scheduling_override",
    terminal: "EARLY_RETURN",
    partial: replan,
  };
};
