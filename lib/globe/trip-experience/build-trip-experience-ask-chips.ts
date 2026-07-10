import type { TripExperienceGapId } from "@/lib/globe/trip-experience/types";

export type TripExperienceAskChip = {
  readonly id: string;
  readonly labelKo: string;
  readonly gapId: TripExperienceGapId;
  readonly value: string;
};

/** One-screen chips for exploratory trip intent. */
export function buildTripExperienceAskChips(
  gaps: readonly TripExperienceGapId[],
): readonly TripExperienceAskChip[] {
  const chips: TripExperienceAskChip[] = [];

  if (gaps.includes("fun_axis")) {
    chips.push(
      { id: "fun_food", labelKo: "먹거리·시장", gapId: "fun_axis", value: "food_market" },
      { id: "fun_nature", labelKo: "자연·휴양", gapId: "fun_axis", value: "nature" },
      { id: "fun_festival", labelKo: "축제·이벤트", gapId: "fun_axis", value: "festival" },
    );
  }

  if (gaps.includes("destination_scope")) {
    chips.push(
      {
        id: "dest_near",
        labelKo: "국내 가까운 곳",
        gapId: "destination_scope",
        value: "domestic_near",
      },
      {
        id: "dest_far",
        labelKo: "국내 멀리",
        gapId: "destination_scope",
        value: "domestic_far",
      },
      { id: "dest_abroad", labelKo: "해외", gapId: "destination_scope", value: "abroad" },
    );
  }

  if (gaps.includes("dates")) {
    chips.push(
      { id: "dates_weekend", labelKo: "이번 주말", gapId: "dates", value: "this_weekend" },
      { id: "dates_next", labelKo: "다음 주", gapId: "dates", value: "next_week" },
      { id: "dates_flexible", labelKo: "날짜 유연", gapId: "dates", value: "flexible_2n" },
    );
  }

  if (gaps.includes("budget")) {
    chips.push(
      { id: "budget_value", labelKo: "실속", gapId: "budget", value: "value" },
      { id: "budget_balanced", labelKo: "보통", gapId: "budget", value: "balanced" },
    );
  }

  return chips.slice(0, 4);
}

export function resolveTripExperienceChipValue(input: {
  gapId: TripExperienceGapId;
  value: string;
  now?: Date;
}): Partial<import("@/lib/globe/trip-experience/types").TripExperienceState> {
  const now = input.now ?? new Date();
  const ymd = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const nextSaturday = () => {
    const date = new Date(now);
    const day = date.getDay();
    const delta = (6 - day + 7) % 7 || 7;
    date.setDate(date.getDate() + delta);
    return date;
  };
  const addDays = (base: Date, days: number) => {
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    return ymd(next);
  };

  if (input.gapId === "fun_axis") {
    const axis = input.value;
    if (
      axis === "food_market" ||
      axis === "nature" ||
      axis === "festival" ||
      axis === "culture" ||
      axis === "open"
    ) {
      return { funAxis: axis };
    }
  }

  if (input.gapId === "destination_scope") {
    const scope = input.value;
    if (
      scope === "domestic_near" ||
      scope === "domestic_far" ||
      scope === "abroad" ||
      scope === "open"
    ) {
      return { destinationScope: scope };
    }
  }

  if (input.gapId === "dates") {
    if (input.value === "this_weekend") {
      const sat = nextSaturday();
      return { checkInIso: ymd(sat), checkOutIso: addDays(sat, 2) };
    }
    if (input.value === "next_week") {
      const start = new Date(now);
      start.setDate(start.getDate() + 7);
      return { checkInIso: ymd(start), checkOutIso: addDays(start, 2) };
    }
    if (input.value === "flexible_2n") {
      return { checkInIso: ymd(now), checkOutIso: addDays(now, 2) };
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

  return {};
}
