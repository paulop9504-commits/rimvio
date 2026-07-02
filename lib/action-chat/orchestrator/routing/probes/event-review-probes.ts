import { orchestrateOcrScheduleCandidates } from "@/lib/event-kernel/review/orchestrate-ocr-schedule-candidates";
import { orchestrateViaReviewExecutionQueue } from "@/lib/event-os/resolve-review-execution-orchestrator";
import type { PrePipelineProbe } from "@/lib/action-chat/orchestrator/routing/pre-pipeline-probe-types";

/** Tier 4 — OCR review date resolution from message. */
export const eventReviewDateProbe: PrePipelineProbe = async (base) => {
  const eventReviewDateResolution = orchestrateViaReviewExecutionQueue({
    message: base.message,
  });
  if (!eventReviewDateResolution) {
    return null;
  }
  return {
    tier: 4,
    label: "EventReviewDateResolution",
    detail: "ocr_review_dates",
    terminal: "EARLY_RETURN",
    partial: eventReviewDateResolution,
  };
};

/** Tier 5 — OCR schedule extract from composer attachment. */
export const ocrScheduleProbe: PrePipelineProbe = async (base) => {
  const ocrSchedule = orchestrateOcrScheduleCandidates({
    composerContext: base.input.composerContext,
    referenceDate: base.context.currentDate,
  });
  if (!ocrSchedule) {
    return null;
  }
  return {
    tier: 5,
    label: "OcrScheduleExtract",
    detail: "composer_attachment",
    terminal: "EARLY_RETURN",
    partial: ocrSchedule,
  };
};
