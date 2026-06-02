import { kernelAllowsPhase1Deterministic } from "@/lib/event-kernel";
import { applyIntentRouteToResult } from "@/lib/action-chat/intent-router";
import { detectEventCandidate } from "@/lib/events/event-candidate";
import { emitEventCandidate } from "@/lib/events/emit-event-candidate";
import { refreshFinalize, type OrchestratorPipelineContext } from "@/lib/action-chat/orchestrator/pipeline-context";
import type { Phase1Outcome } from "@/lib/action-chat/orchestrator/pipeline-types";
import { runPhase1Tier } from "@/lib/action-chat/orchestrator/tier-runner";
import type { Phase1TierRunner } from "@/lib/action-chat/orchestrator/tier-runner";
import { TIER_0_KILL_SWITCH_RUNNERS } from "@/lib/action-chat/orchestrator/tiers/tier-0-kill-switch";
import { TIER_1_SECURITY_RUNNERS } from "@/lib/action-chat/orchestrator/tiers/tier-1-security";
import { TIER_2_CORRECTION_RUNNERS } from "@/lib/action-chat/orchestrator/tiers/tier-2-correction";
import { TIER_3_WORKFLOW_RUNNERS } from "@/lib/action-chat/orchestrator/tiers/tier-3-workflow";
import { TIER_4_REGISTRY_RUNNERS } from "@/lib/action-chat/orchestrator/tiers/tier-4-registry";
import { TIER_5_DETERMINISTIC_RUNNERS } from "@/lib/action-chat/orchestrator/tiers/tier-5-deterministic";

const PRE_EVENT_DETECTION_RUNNERS = [
  ...TIER_0_KILL_SWITCH_RUNNERS,
  ...TIER_1_SECURITY_RUNNERS,
  ...TIER_2_CORRECTION_RUNNERS,
];

const POST_EVENT_WORKFLOW_RUNNERS = [
  ...TIER_3_WORKFLOW_RUNNERS,
  ...TIER_4_REGISTRY_RUNNERS,
];

const POST_EVENT_DETERMINISTIC_RUNNERS = [...TIER_5_DETERMINISTIC_RUNNERS];

function resolvePhase1EarlyReturn(
  ctx: OrchestratorPipelineContext,
  runner: Phase1TierRunner,
  hit: NonNullable<Phase1Outcome["earlyReturn"]>
): Phase1Outcome {
  if (runner.tier === 3 && runner.detail === "ContainerGate") {
    return { phase: 1, earlyReturn: applyIntentRouteToResult(hit, ctx.route) };
  }
  if (
    runner.tier === 3 &&
    (runner.detail === "ConversationRecall" || runner.detail === "KnowledgeRecall")
  ) {
    return { phase: 1, earlyReturn: applyIntentRouteToResult(hit, ctx.route) };
  }
  if (runner.tier === 5 && runner.detail === "VerbDatePicker") {
    return { phase: 1, earlyReturn: applyIntentRouteToResult(hit, ctx.route) };
  }
  return { phase: 1, earlyReturn: hit };
}

function runEventDetection(ctx: OrchestratorPipelineContext) {
  const draft = detectEventCandidate({
    message: ctx.message,
    referenceDate: ctx.context.currentDate,
    containerId: ctx.containerRoute.container?.id ?? null,
  });
  const wire = emitEventCandidate(draft);
  ctx.eventCandidate = wire;
  if (wire) {
    ctx.trace.inject(2, "EventDetection", wire.title);
  } else {
    ctx.trace.pass(1, 2, "EventDetection");
  }
}

async function runTierGroup(
  ctx: OrchestratorPipelineContext,
  runners: Phase1TierRunner[]
): Promise<{ runner: Phase1TierRunner; hit: NonNullable<Phase1Outcome["earlyReturn"]> } | null> {
  for (const runner of runners) {
    const hit = await runPhase1Tier(ctx, runner);
    if (hit) {
      return { runner, hit };
    }
  }
  return null;
}

/** PHASE 1 — PRE-PIPELINE: Tier 0–2 → EventDetection → Tier 3–5 */
export async function runPhase1PrePipeline(
  ctx: OrchestratorPipelineContext
): Promise<Phase1Outcome> {
  const preHit = await runTierGroup(ctx, PRE_EVENT_DETECTION_RUNNERS);

  runEventDetection(ctx);
  refreshFinalize(ctx);

  if (preHit) {
    ctx.trace.terminal("EARLY_RETURN");
    return resolvePhase1EarlyReturn(ctx, preHit.runner, preHit.hit);
  }

  const postHit = await runTierGroup(ctx, POST_EVENT_WORKFLOW_RUNNERS);
  if (postHit) {
    ctx.trace.terminal("EARLY_RETURN");
    return resolvePhase1EarlyReturn(ctx, postHit.runner, postHit.hit);
  }

  if (kernelAllowsPhase1Deterministic(ctx.kernel)) {
    const tier5Hit = await runTierGroup(ctx, POST_EVENT_DETERMINISTIC_RUNNERS);
    if (tier5Hit) {
      ctx.trace.terminal("EARLY_RETURN");
      return resolvePhase1EarlyReturn(ctx, tier5Hit.runner, tier5Hit.hit);
    }
  } else {
    ctx.trace.pass(1, 5, "DeterministicTier", "kernel_blocked");
  }

  return { phase: 1, earlyReturn: null };
}
