import type { TransitPrepGapId } from "@/lib/globe/transit-prep/plan-one-shot-transit-prep";

export type TransitPrepAskChip = {
  readonly id: string;
  readonly labelKo: string;
  readonly gapId: TransitPrepGapId;
  readonly value: string;
};

/** One-screen chip confirm for ambiguous transit destination. */
export function buildTransitPrepAskChips(
  gaps: readonly TransitPrepGapId[],
): readonly TransitPrepAskChip[] {
  const chips: TransitPrepAskChip[] = [];

  if (gaps.includes("destination")) {
    chips.push(
      { id: "dest_airport", labelKo: "공항", gapId: "destination", value: "공항" },
      { id: "dest_hotel", labelKo: "숙소", gapId: "destination", value: "숙소" },
      { id: "dest_station", labelKo: "역", gapId: "destination", value: "역" },
    );
  }

  if (gaps.includes("origin")) {
    chips.push(
      { id: "origin_here", labelKo: "지금 있는 곳", gapId: "origin", value: "현재 위치" },
    );
  }

  return chips.slice(0, 4);
}

export function resolveTransitPrepChipValue(input: {
  gapId: TransitPrepGapId;
  value: string;
}): Partial<{ destinationLabel: string; originLabel: string }> {
  const value = input.value.trim();
  if (!value) {
    return {};
  }
  if (input.gapId === "destination") {
    return { destinationLabel: value };
  }
  if (input.gapId === "origin") {
    return { originLabel: value };
  }
  return {};
}
