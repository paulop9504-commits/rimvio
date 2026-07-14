"use client";

import {
  openFinancePaymentFieldClient,
  type OpenFinancePaymentFieldResult,
} from "@/lib/globe/finance-prep/open-finance-payment-field-client";
import {
  commitOneShotFinanceMainClient,
  runOneShotFinancePrepClient,
  type RunOneShotFinancePrepResult,
} from "@/lib/globe/finance-prep/run-one-shot-finance-prep-client";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type TryCompleteFinancePrepResult = {
  readonly prep: RunOneShotFinancePrepResult | null;
  readonly committed: boolean;
  readonly fieldOpened: boolean;
  readonly fieldMode: OpenFinancePaymentFieldResult["mode"] | null;
};

/** After budget chips — open payment prep Field when budget is ready. */
export function tryCompleteFinancePrepClient(input: {
  message: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
  openField?: boolean;
}): TryCompleteFinancePrepResult {
  const prep = runOneShotFinancePrepClient({
    message: input.message,
    contextEventId: input.contextEventId,
    event: input.event,
  });
  if (!prep?.plan.readyForPayment) {
    return {
      prep,
      committed: false,
      fieldOpened: false,
      fieldMode: null,
    };
  }

  const commit = commitOneShotFinanceMainClient({
    contextEventId: input.contextEventId,
    triggerMessage: input.message,
    event: prep.event,
    prepResult: prep,
  });
  if (!commit.committed) {
    return {
      prep,
      committed: false,
      fieldOpened: false,
      fieldMode: null,
    };
  }

  const field =
    input.openField === false
      ? ({
          opened: false,
          mode: "capability_only",
          capabilityDispatched: false,
          placeId: null,
        } satisfies OpenFinancePaymentFieldResult)
      : openFinancePaymentFieldClient({
          contextEventId: input.contextEventId,
          event: prep.event,
          budgetBand: commit.budgetBand,
        });

  return {
    prep,
    committed: true,
    fieldOpened: field.opened,
    fieldMode: field.mode,
  };
}
