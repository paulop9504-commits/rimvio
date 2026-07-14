"use client";

/**
 * After step advance — auto-scout when engine is ready; else chips-first handoff.
 * System sequencer Act (post-approval) — one Act; not user-turn multi-tool.
 */

import {
  appendContextAgentComposeTurn,
  appendOperatorAskChipsComposeTurn,
} from "@/lib/globe/assistant";
import { resolvePlanStepHandoffOffer } from "@/lib/context-execution/build-plan-step-handoff";
import { resolvePlanStepAutoAdvance } from "@/lib/context-execution/resolve-plan-step-auto-advance";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { requestGlobeComposeSeed } from "@/lib/globe/globe-compose-seed-bridge";
import {
  requestOperatorAutoRun,
  wasOperatorAutoRunClaimed,
} from "@/lib/globe/operator-turn/operator-auto-run-bridge";
import { recordPlanSequencerProgress } from "@/lib/context-execution/record-plan-sequencer-progress";

function offerChipsHandoff(input: {
  contextEventId: string;
  plan: ContextExecutionPlanV1;
}): boolean {
  const offer = resolvePlanStepHandoffOffer(input.plan);
  if (!offer) {
    return false;
  }

  appendContextAgentComposeTurn(input.contextEventId, {
    role: "assistant",
    kind: "text",
    text: offer.hintKo,
  });

  appendOperatorAskChipsComposeTurn(input.contextEventId, {
    chipDomain: "plan_handoff",
    hint: offer.hintKo,
    pendingTrigger: offer.seedUtterance,
    chips: offer.chips.map((chip) => ({
      id: chip.id,
      labelKo: chip.labelKo,
      gapId: chip.gapId,
      value: chip.value,
    })),
  });

  return true;
}

function fireAutoScout(input: {
  contextEventId: string;
  engineId: import("@/lib/engine/engine-types").RimvioEngineId;
  seedUtterance: string;
  progressKo: string;
  source: "plan_step_auto_scout";
}): void {
  appendContextAgentComposeTurn(input.contextEventId, {
    role: "assistant",
    kind: "text",
    text: input.progressKo,
  });
  recordPlanSequencerProgress({
    contextEventId: input.contextEventId,
    engineId: input.engineId,
    phase: "auto_scout",
    detailKo: input.progressKo,
  });

  requestOperatorAutoRun({
    contextEventId: input.contextEventId,
    text: input.seedUtterance,
    source: input.source,
    progressKo: input.progressKo,
    expressReady: true,
  });

  // Fallback when pin-bar is not mounted (open Globe chat compose).
  window.setTimeout(() => {
    if (
      wasOperatorAutoRunClaimed({
        contextEventId: input.contextEventId,
        text: input.seedUtterance,
      })
    ) {
      return;
    }
    requestGlobeComposeSeed({
      text: input.seedUtterance,
      source: "manual",
    });
  }, 0);
}

export function offerPlanStepHandoffAfterAdvance(input: {
  contextEventId: string;
  plan: ContextExecutionPlanV1;
  userLat?: number | null;
  userLng?: number | null;
}): boolean {
  const event = findLifeEventCandidate(input.contextEventId);
  const decision = resolvePlanStepAutoAdvance({
    plan: input.plan,
    event,
    userLat: input.userLat,
    userLng: input.userLng,
  });

  if (decision.kind === "none") {
    return false;
  }

  if (decision.kind === "chips") {
    return offerChipsHandoff(input);
  }

  fireAutoScout({
    contextEventId: input.contextEventId,
    engineId: decision.engineId,
    seedUtterance: decision.seedUtterance,
    progressKo: decision.progressKo,
    source: "plan_step_auto_scout",
  });

  return true;
}
