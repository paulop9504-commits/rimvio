"use client";

/**
 * After step advance — surface next-engine ask_chips on Globe compose (chips-first).
 */

import {
  appendContextAgentComposeTurn,
  appendOperatorAskChipsComposeTurn,
} from "@/lib/globe/assistant";
import { resolvePlanStepHandoffOffer } from "@/lib/context-execution/build-plan-step-handoff";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";

export function offerPlanStepHandoffAfterAdvance(input: {
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
