import { runPhase1PrePipeline } from "@/lib/action-chat/orchestrator/phase-1-pre-pipeline";
import { runPhase2Enrichment } from "@/lib/action-chat/orchestrator/phase-2-enrichment";
import { runPhase3Resolve } from "@/lib/action-chat/orchestrator/phase-3-resolve";
import { refreshFinalize } from "@/lib/action-chat/orchestrator/pipeline-context";
import type { OrchestratorPipelineContext } from "@/lib/action-chat/orchestrator/pipeline-context";
import {
  completeStandardPipelineResult,
  type OrchestratorPipelineBase,
} from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { dispatchExecutionFeedStep } from "@/lib/context-run/execution-feed-bridge";
import { copy } from "@/lib/copy/human-ko";

/**
 * Standard path — linear decision tree (replaces implicit phase 1 → 2 → 3 routing).
 *
 * Step A: tier + event detection (phase 1)
 * Step B: enrichment + fast path (phase 2)
 * Step C: intent kernel + LLM/rules resolve (phase 3)
 */
export async function runOrchestratorStandardPipeline(
  base: OrchestratorPipelineBase,
  ctx: OrchestratorPipelineContext,
): Promise<OrchestratorResult> {
  const graphId = ctx.input.sessionScopeId ?? `orch-${Date.now()}`;

  dispatchExecutionFeedStep({
    graphId,
    stepId: "phase1",
    labelKo: copy.globe.activityOrchestratorPhase1,
    status: "running",
  });
  const tierOutcome = await runPhase1PrePipeline(ctx);
  dispatchExecutionFeedStep({
    graphId,
    stepId: "phase1",
    labelKo: copy.globe.activityOrchestratorPhase1,
    status: "done",
  });
  if (tierOutcome.earlyReturn) {
    return completeStandardPipelineResult(base, ctx, tierOutcome.earlyReturn, false);
  }

  dispatchExecutionFeedStep({
    graphId,
    stepId: "phase2",
    labelKo: copy.globe.activityOrchestratorPhase2,
    status: "running",
  });
  const enrichOutcome = await runPhase2Enrichment(ctx);
  refreshFinalize(ctx);
  dispatchExecutionFeedStep({
    graphId,
    stepId: "phase2",
    labelKo: copy.globe.activityOrchestratorPhase2,
    status: "done",
  });
  if (enrichOutcome.fastPath) {
    return completeStandardPipelineResult(base, ctx, enrichOutcome.fastPath, false);
  }

  dispatchExecutionFeedStep({
    graphId,
    stepId: "phase3",
    labelKo: copy.globe.activityOrchestratorPhase3,
    status: "running",
  });
  ctx.enrichment = enrichOutcome.enrichment;
  const resolveOutcome = await runPhase3Resolve(ctx);
  dispatchExecutionFeedStep({
    graphId,
    stepId: "phase3",
    labelKo: copy.globe.activityOrchestratorPhase3,
    status: "done",
  });
  return completeStandardPipelineResult(base, ctx, resolveOutcome.result, true);
}
