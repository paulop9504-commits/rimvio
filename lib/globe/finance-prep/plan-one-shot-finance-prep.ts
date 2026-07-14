import type { EventCandidate } from "@/lib/events/event-candidate";
import { isFinancePrepUtterance } from "@/lib/globe/finance-prep/is-finance-prep-utterance";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";
import type { TripBudgetBand } from "@/lib/globe/trip-intake/types";

export type FinancePrepGapId = "budget";

export type FinancePrepState = {
  readonly budgetBand: TripBudgetBand | null;
  readonly paymentIntent: boolean;
};

export type OneShotFinancePrepStep =
  | "parse_finance_intent"
  | "merge_budget"
  | "open_payment_field";

export type OneShotFinancePrepPlan = {
  readonly message: string;
  readonly financeState: FinancePrepState;
  readonly financeGaps: readonly FinancePrepGapId[];
  readonly readyForPayment: boolean;
  readonly steps: readonly OneShotFinancePrepStep[];
};

function hasPaymentIntent(message: string): boolean {
  return /(?:결제|환전|payment|카드|페이)/iu.test(message);
}

function readFinancePrepState(input: {
  event: EventCandidate | null | undefined;
  message: string;
}): FinancePrepState {
  const intake = readTripIntakeState({
    event: input.event,
    message: input.message,
  });
  return {
    budgetBand: intake.budgetBand,
    paymentIntent: hasPaymentIntent(input.message),
  };
}

function assessFinancePrepGaps(state: FinancePrepState): readonly FinancePrepGapId[] {
  if (!state.budgetBand) {
    return ["budget"];
  }
  return [];
}

/** Pure plan — finance utterance → budget slot → payment Field readiness. */
export function planOneShotFinancePrep(input: {
  message: string;
  event: EventCandidate | null | undefined;
}): OneShotFinancePrepPlan | null {
  const message = input.message.trim();
  if (!message || !isFinancePrepUtterance(message)) {
    return null;
  }

  const financeState = readFinancePrepState({
    event: input.event,
    message,
  });
  const financeGaps = assessFinancePrepGaps(financeState);
  const readyForPayment = financeGaps.length === 0;

  const steps: OneShotFinancePrepStep[] = ["parse_finance_intent", "merge_budget"];
  if (readyForPayment) {
    steps.push("open_payment_field");
  }

  return {
    message,
    financeState,
    financeGaps,
    readyForPayment,
    steps,
  };
}
