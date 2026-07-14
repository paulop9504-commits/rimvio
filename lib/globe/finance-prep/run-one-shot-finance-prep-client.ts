"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { recordEngineLifecycleClient } from "@/lib/engine/record-engine-lifecycle";
import { openPendingFieldHandoffClient } from "@/lib/engine/team-collab/open-field-handoff-client";
import {
  planOneShotFinancePrep,
  type OneShotFinancePrepPlan,
} from "@/lib/globe/finance-prep/plan-one-shot-finance-prep";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";
import { writeTripIntakePartial } from "@/lib/globe/trip-intake/write-trip-intake-partial";

export type RunOneShotFinancePrepResult = {
  readonly plan: OneShotFinancePrepPlan;
  readonly event: EventCandidate | null;
};

/** Client — persist budget band before payment Field open. */
export function runOneShotFinancePrepClient(input: {
  message: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
}): RunOneShotFinancePrepResult | null {
  const plan = planOneShotFinancePrep({
    message: input.message,
    event: input.event,
  });
  if (!plan) {
    return null;
  }

  let event = input.event ?? null;
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return { plan, event };
  }

  const base = readTripIntakeState({ event, message: input.message });
  const budgetBand = plan.financeState.budgetBand ?? base.budgetBand;
  if (budgetBand) {
    event = writeTripIntakePartial({
      contextEventId,
      state: {
        destinationLabel: base.destinationLabel,
        originLabel: base.originLabel,
        checkInIso: base.checkInIso,
        checkOutIso: base.checkOutIso,
        guestCount: base.guestCount ?? 1,
        budgetBand,
      },
    });
  }

  return { plan, event };
}

export type CommitOneShotFinanceMainResult = {
  readonly committed: boolean;
  readonly budgetBand: string | null;
};

/** Prepare finance MAIN — budget locked; approval before external charge. */
export function commitOneShotFinanceMainClient(input: {
  contextEventId: string;
  triggerMessage: string;
  event: EventCandidate | null | undefined;
  prepResult?: RunOneShotFinancePrepResult | null;
}): CommitOneShotFinanceMainResult {
  const prep =
    input.prepResult?.plan ??
    planOneShotFinancePrep({
      message: input.triggerMessage,
      event: input.event,
    });
  if (!prep?.readyForPayment) {
    return { committed: false, budgetBand: null };
  }

  const budgetBand = prep.financeState.budgetBand;
  if (!budgetBand) {
    return { committed: false, budgetBand: null };
  }

  recordEngineLifecycleClient({
    contextEventId: input.contextEventId,
    engineId: "finance_prep",
    kind: "main_selected",
    payload: {
      budgetBand,
      paymentIntent: prep.financeState.paymentIntent,
    },
  });
  openPendingFieldHandoffClient(input.contextEventId);

  return { committed: true, budgetBand };
}
