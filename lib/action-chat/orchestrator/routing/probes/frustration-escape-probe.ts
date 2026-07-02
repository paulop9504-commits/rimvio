import { orchestrateFrustrationEscape } from "@/lib/action-chat/adaptive-behavior/ux-guards/orchestrate-ux-guards";
import type { PrePipelineProbe } from "@/lib/action-chat/orchestrator/routing/pre-pipeline-probe-types";

/** Tier 3 — UX circuit breaker after session correction. */
export const frustrationEscapeProbe: PrePipelineProbe = async (base) => {
  if (!base.adaptive.ux.frustrationEscape) {
    return null;
  }
  return {
    tier: 3,
    label: "FrustrationEscape",
    detail: "UX_circuit_breaker",
    terminal: "EARLY_RETURN",
    partial: orchestrateFrustrationEscape(base.adaptive),
    applyPresentation: true,
  };
};
