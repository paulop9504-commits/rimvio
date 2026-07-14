import { copy } from "@/lib/copy/human-ko";
import {
  estimateLodgingTransit,
  formatWalkMinutesLabel,
} from "@/lib/globe/lodging/estimate-lodging-transit";
import type { LodgingRankMode } from "@/lib/globe/lodging/lodging-rank-profile";
import type {
  TravelBudgetBand,
  TravelLodgingPriority,
} from "@/lib/situation-projection/travel-brain-personalization";

/** Approximate outer lodging used for “what you save vs farther stay”. */
const OUTER_COMPARE_KM = 6;

export type LodgingOpportunityInsight = {
  readonly saveLineKo: string | null;
  readonly opportunityCostLineKo: string | null;
  readonly experienceLineKo: string | null;
  /** Best single line for reasonKo when value/efficiency framing wins. */
  readonly primaryLineKo: string | null;
  readonly lines: readonly string[];
};

function roundFareBand(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  if (amount < 1500) {
    return 1000;
  }
  return Math.round(amount / 1000) * 1000;
}

function formatApproxFareKrw(amount: number): string {
  const band = roundFareBand(amount);
  if (band <= 0) {
    return "";
  }
  return `약 ${band.toLocaleString("ko-KR")}원대`;
}

function formatApproxFareYen(amount: number): string {
  const band = roundFareBand(amount);
  if (band <= 0) {
    return "";
  }
  return `약 ¥${band.toLocaleString("ko-KR")}대`;
}

function uniqueLines(
  ...candidates: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of candidates) {
    const trimmed = line?.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= 3) {
      break;
    }
  }
  return out;
}

export function isLodgingValueLeaning(input: {
  mode?: LodgingRankMode | null;
  budgetBand?: TravelBudgetBand | null;
  lodgingPriority?: TravelLodgingPriority | null;
  priceWeight?: number | null;
}): boolean {
  if (input.mode === "value") {
    return true;
  }
  if (input.budgetBand === "value") {
    return true;
  }
  if (input.lodgingPriority === "price") {
    return true;
  }
  return (input.priceWeight ?? 0) >= 0.38;
}

/**
 * Deterministic secretary copy: save · opportunity cost · enabled experience.
 * Approximate only — never fake precision.
 */
export function buildLodgingOpportunityInsight(input: {
  lodgingLat: number;
  lodgingLng: number;
  hubLat: number;
  hubLng: number;
  priceKrw?: number | null;
  cohortMedianPriceKrw?: number | null;
  lodgingPriority?: TravelLodgingPriority | null;
  budgetBand?: TravelBudgetBand | null;
  rankMode?: LodgingRankMode | null;
  overseas?: boolean;
}): LodgingOpportunityInsight {
  const globe = copy.globe;
  const transit = estimateLodgingTransit(
    input.lodgingLat,
    input.lodgingLng,
    input.hubLat,
    input.hubLng,
  );
  const outer = estimateLodgingTransit(
    input.hubLat,
    input.hubLng,
    input.hubLat + OUTER_COMPARE_KM / 111,
    input.hubLng,
  );
  const nearFare = input.overseas ? transit.taxiFareYen : transit.taxiFareKrw;
  const outerFare = input.overseas ? outer.taxiFareYen : outer.taxiFareKrw;
  const roundTripSave = Math.max(0, (outerFare - nearFare) * 2);
  const fareLabel = input.overseas
    ? formatApproxFareYen(roundTripSave)
    : formatApproxFareKrw(roundTripSave);
  const walkLabel = formatWalkMinutesLabel(transit.walkMinutes);

  let saveLineKo: string | null = null;
  let opportunityCostLineKo: string | null = null;
  let experienceLineKo: string | null = null;

  if (transit.distanceKm <= 1.2) {
    saveLineKo = fareLabel
      ? globe.lodgingOpportunitySaveWalkNear(walkLabel, fareLabel)
      : globe.lodgingOpportunitySaveWalkOnly(walkLabel);
  } else if (transit.distanceKm <= 2.8) {
    saveLineKo = fareLabel
      ? globe.lodgingOpportunitySaveShortHop(walkLabel, fareLabel)
      : globe.lodgingOpportunitySaveWalkOnly(walkLabel);
  } else if (transit.distanceKm >= 3.5) {
    const roundTripMinutes = Math.max(
      20,
      Math.round(transit.taxiMinutes * 2),
    );
    opportunityCostLineKo = globe.lodgingOpportunityCostFar(roundTripMinutes);
  }

  const price = input.priceKrw;
  const median = input.cohortMedianPriceKrw;
  if (
    price != null &&
    median != null &&
    Number.isFinite(price) &&
    Number.isFinite(median) &&
    median > 0 &&
    price <= median * 0.92
  ) {
    const priceSave = saveLineKo
      ? null
      : globe.lodgingOpportunityPriceVsArea;
    if (priceSave && !saveLineKo) {
      saveLineKo = priceSave;
    } else if (!saveLineKo) {
      saveLineKo = globe.lodgingOpportunityPriceVsArea;
    } else if (isLodgingValueLeaning(input)) {
      // Prefer composing price cue into experience when walk save already exists.
      experienceLineKo =
        experienceLineKo ?? globe.lodgingOpportunityExperienceKeepBudget;
    }
  }

  switch (input.lodgingPriority) {
    case "station":
      experienceLineKo =
        experienceLineKo ?? globe.lodgingOpportunityExperienceStation;
      break;
    case "family":
      experienceLineKo =
        experienceLineKo ?? globe.lodgingOpportunityExperienceFamily;
      break;
    case "aesthetic":
      experienceLineKo =
        experienceLineKo ?? globe.lodgingOpportunityExperienceAesthetic;
      break;
    case "quiet":
      experienceLineKo =
        experienceLineKo ?? globe.lodgingOpportunityExperienceQuiet;
      break;
    case "price":
      experienceLineKo =
        experienceLineKo ??
        (transit.distanceKm <= 2.8
          ? globe.lodgingOpportunityExperienceKeepBudget
          : globe.lodgingOpportunityExperienceValueTradeoff);
      break;
    default:
      if (transit.distanceKm <= 2.8) {
        experienceLineKo =
          experienceLineKo ?? globe.lodgingOpportunityExperienceNearby;
      }
      break;
  }

  const valueLeaning = isLodgingValueLeaning(input);
  const primaryLineKo = valueLeaning
    ? saveLineKo ??
      opportunityCostLineKo ??
      experienceLineKo
    : experienceLineKo ?? saveLineKo ?? opportunityCostLineKo;

  return {
    saveLineKo,
    opportunityCostLineKo,
    experienceLineKo,
    primaryLineKo,
    lines: uniqueLines(
      valueLeaning ? saveLineKo : experienceLineKo,
      valueLeaning ? experienceLineKo : saveLineKo,
      opportunityCostLineKo,
    ),
  };
}

/** Median of finite positive prices — cohort for soft “area vs price” copy. */
export function medianLodgingPriceKrw(
  prices: readonly (number | null | undefined)[],
): number | null {
  const values = prices
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  if (values.length === 0) {
    return null;
  }
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 1) {
    return values[mid]!;
  }
  return Math.round((values[mid - 1]! + values[mid]!) / 2);
}
