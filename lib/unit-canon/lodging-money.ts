/**
 * Lodging money helpers — Unit Canon: display = nightly, commit = total.
 */

import {
  DEFAULT_CURRENCY,
  LODGING_COMMIT_MONEY_BASIS,
  LODGING_DISPLAY_MONEY_BASIS,
  type MeasuredMoney,
} from "@/lib/unit-canon/constants";

const DAY_MS = 86_400_000;

export function resolveStayNights(input: {
  readonly nights?: number | null;
  readonly checkInIso?: string | null;
  readonly checkOutIso?: string | null;
}): number {
  if (
    typeof input.nights === "number" &&
    Number.isFinite(input.nights) &&
    input.nights > 0
  ) {
    return Math.max(1, Math.round(input.nights));
  }
  const inMs = input.checkInIso ? Date.parse(input.checkInIso) : NaN;
  const outMs = input.checkOutIso ? Date.parse(input.checkOutIso) : NaN;
  if (Number.isFinite(inMs) && Number.isFinite(outMs) && outMs > inMs) {
    return Math.max(1, Math.round((outMs - inMs) / DAY_MS));
  }
  return 1;
}

/**
 * Resolve nightly KRW from offer/row fields.
 * - Mock/derived: priceKrw = nightly, totalPriceKrw = stay total
 * - LiteAPI (legacy): both fields may hold stay total → divide by nights
 */
export function resolveLodgingNightlyKrw(input: {
  readonly priceKrw?: number | null;
  readonly totalPriceKrw?: number | null;
  readonly nights: number;
}): number | null {
  const nights = Math.max(1, Math.round(input.nights));
  const price =
    input.priceKrw != null && Number.isFinite(input.priceKrw) && input.priceKrw > 0
      ? input.priceKrw
      : null;
  const total =
    input.totalPriceKrw != null &&
    Number.isFinite(input.totalPriceKrw) &&
    input.totalPriceKrw > 0
      ? input.totalPriceKrw
      : null;

  if (price != null && total != null && nights > 1) {
    const looksLikeNightlyTimesStay =
      Math.abs(total - price * nights) / Math.max(total, 1) < 0.08;
    if (looksLikeNightlyTimesStay && Math.abs(total - price) > 1) {
      return Math.round(price);
    }
    if (Math.abs(total - price) < 1) {
      return Math.round(total / nights);
    }
  }

  if (total != null && nights > 1 && (price == null || Math.abs(total - price) < 1)) {
    return Math.round(total / nights);
  }

  if (price != null) {
    return Math.round(price);
  }
  if (total != null) {
    return Math.round(nights > 1 ? total / nights : total);
  }
  return null;
}

/** Card / list amount only — UI appends `/ 1박`. */
export function formatLodgingNightlyPriceLabelKo(nightlyKrw: number): string {
  return `${Math.round(nightlyKrw).toLocaleString("ko-KR")}원`;
}

/** Strip existing `/박` suffix so UI can attach a single `/ 1박`. */
export function stripLodgingPerNightSuffix(label: string): string {
  return label
    .replace(/\s*\/\s*1?\s*박/gu, "")
    .replace(/\s*1박당/gu, "")
    .replace(/\s*박당/gu, "")
    .trim();
}

export function formatHotelPriceDisplayKo(label: string | null | undefined): {
  readonly amountKo: string;
  readonly perNightSuffix: boolean;
} | null {
  const raw = label?.trim();
  if (!raw) return null;
  const amountKo = stripLodgingPerNightSuffix(raw);
  if (!amountKo) return null;
  return { amountKo, perNightSuffix: true };
}

export function measuredLodgingDisplayMoney(
  nightlyKrw: number,
  nights?: number | null,
): MeasuredMoney {
  return {
    amount: Math.round(nightlyKrw),
    currency: DEFAULT_CURRENCY,
    basis: LODGING_DISPLAY_MONEY_BASIS,
    nights: nights ?? null,
  };
}

export function measuredLodgingCommitMoney(
  totalKrw: number,
  nights?: number | null,
): MeasuredMoney {
  return {
    amount: Math.round(totalKrw),
    currency: DEFAULT_CURRENCY,
    basis: LODGING_COMMIT_MONEY_BASIS,
    nights: nights ?? null,
  };
}
