import type { PrePipelineProbe } from "@/lib/action-chat/orchestrator/routing/pre-pipeline-probe-types";
import {
  eventReviewDateProbe,
  ocrScheduleProbe,
} from "@/lib/action-chat/orchestrator/routing/probes/event-review-probes";
import { frustrationEscapeProbe } from "@/lib/action-chat/orchestrator/routing/probes/frustration-escape-probe";
import { globalReplanProbe } from "@/lib/action-chat/orchestrator/routing/probes/global-replan-probe";
import {
  contentPolicyProbe,
  killSwitchProbe,
  piiSecurityProbe,
} from "@/lib/action-chat/orchestrator/routing/probes/security-probes";
import { sessionCorrectionProbe } from "@/lib/action-chat/orchestrator/routing/probes/session-correction-probe";

/** Ordered pre-pipeline probes — first hit wins. Grow by appending modules here. */
export const PRE_PIPELINE_PROBE_ORDER: readonly PrePipelineProbe[] = [
  killSwitchProbe,
  piiSecurityProbe,
  contentPolicyProbe,
  sessionCorrectionProbe,
  frustrationEscapeProbe,
  globalReplanProbe,
  eventReviewDateProbe,
  ocrScheduleProbe,
];
