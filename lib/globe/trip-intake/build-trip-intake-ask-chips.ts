import type { TripIntakeGapId } from "@/lib/globe/trip-intake/types";

export type TripIntakeAskChip = {
  readonly id: string;
  readonly labelKo: string;
  readonly gapId: TripIntakeGapId;
  readonly value: string;
};

/** One-screen chip confirm for ambiguous trip intake slots. */
export function buildTripIntakeAskChips(
  gaps: readonly TripIntakeGapId[],
): readonly TripIntakeAskChip[] {
  const chips: TripIntakeAskChip[] = [];

  if (gaps.includes("dates")) {
    chips.push(
      { id: "dates_tonight", labelKo: "오늘 밤", gapId: "dates", value: "tonight_1n" },
      { id: "dates_tomorrow", labelKo: "내일부터 1박", gapId: "dates", value: "tomorrow_1n" },
      { id: "dates_two_nights", labelKo: "2박", gapId: "dates", value: "two_nights" },
    );
  }

  if (gaps.includes("budget")) {
    chips.push(
      { id: "budget_value", labelKo: "실속", gapId: "budget", value: "value" },
      { id: "budget_balanced", labelKo: "보통", gapId: "budget", value: "balanced" },
      { id: "budget_premium", labelKo: "프리미엄", gapId: "budget", value: "premium" },
    );
  }

  if (gaps.includes("guests")) {
    chips.push(
      { id: "guests_1", labelKo: "1명", gapId: "guests", value: "1" },
      { id: "guests_2", labelKo: "2명", gapId: "guests", value: "2" },
    );
  }

  if (gaps.includes("origin")) {
    chips.push(
      { id: "origin_here", labelKo: "지금 있는 곳", gapId: "origin", value: "current_city" },
      { id: "origin_seoul", labelKo: "서울 출발", gapId: "origin", value: "서울" },
    );
  }

  return chips.slice(0, 4);
}

export function resolveTripIntakeChipValue(input: {
  gapId: TripIntakeGapId;
  value: string;
  now?: Date;
}): Partial<{
  checkInIso: string;
  checkOutIso: string;
  guestCount: number;
  budgetBand: "value" | "balanced" | "premium";
  originLabel: string;
}> {
  const now = input.now ?? new Date();
  const ymd = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const addDays = (days: number) => {
    const next = new Date(now);
    next.setDate(next.getDate() + days);
    return ymd(next);
  };

  if (input.gapId === "dates") {
    if (input.value === "tonight_1n") {
      return { checkInIso: ymd(now), checkOutIso: addDays(1) };
    }
    if (input.value === "tomorrow_1n") {
      return { checkInIso: addDays(1), checkOutIso: addDays(2) };
    }
    if (input.value === "two_nights") {
      return { checkInIso: ymd(now), checkOutIso: addDays(2) };
    }
  }

  if (input.gapId === "budget") {
    if (input.value === "value" || input.value === "balanced" || input.value === "premium") {
      return { budgetBand: input.value };
    }
  }

  if (input.gapId === "guests") {
    const count = Number.parseInt(input.value, 10);
    if (Number.isFinite(count) && count > 0) {
      return { guestCount: count };
    }
  }

  if (input.gapId === "origin" && input.value.trim()) {
    if (input.value === "current_city") {
      return { originLabel: "현재 위치" };
    }
    return { originLabel: input.value.trim() };
  }

  return {};
}
