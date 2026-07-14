import type { FinancePrepGapId } from "@/lib/globe/finance-prep/plan-one-shot-finance-prep";
import type { TripBudgetBand } from "@/lib/globe/trip-intake/types";

export type FinancePrepAskChip = {
  readonly id: string;
  readonly labelKo: string;
  readonly gapId: FinancePrepGapId;
  readonly value: string;
};

/** Budget band chips for finance / payment prep. */
export function buildFinancePrepAskChips(
  gaps: readonly FinancePrepGapId[],
): readonly FinancePrepAskChip[] {
  const chips: FinancePrepAskChip[] = [];

  if (gaps.includes("budget")) {
    chips.push(
      { id: "budget_value", labelKo: "실속", gapId: "budget", value: "value" },
      { id: "budget_balanced", labelKo: "보통", gapId: "budget", value: "balanced" },
      { id: "budget_premium", labelKo: "프리미엄", gapId: "budget", value: "premium" },
    );
  }

  return chips;
}

export function resolveFinancePrepChipValue(input: {
  gapId: FinancePrepGapId;
  value: string;
}): Partial<{ budgetBand: TripBudgetBand }> {
  if (input.gapId === "budget") {
    if (
      input.value === "value" ||
      input.value === "balanced" ||
      input.value === "premium"
    ) {
      return { budgetBand: input.value };
    }
  }
  return {};
}
