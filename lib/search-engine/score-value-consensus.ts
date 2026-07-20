/**
 * Value-consensus ranking for Tool / Diff Search hits.
 * Prefer mean/median-centered quality + 가성비; push bland / expensive-mediocre back.
 * Does not open feeds or Commit.
 */

export type ValueConsensusCandidate = {
  readonly id?: string;
  readonly labelKo?: string;
  readonly rating?: number | null;
  readonly walkMinutes?: number | null;
  readonly priceBand?: number | null;
  readonly reservable?: boolean | null;
  readonly localFavorite?: boolean | null;
  readonly reviewCount?: number | null;
  readonly priceKrw?: number | null;
};

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Soft bell around cohort center — peak at median/mean, taper extremes.
 * width ≈ how far ± from center still scores well.
 */
function nearCenterScore(
  value: number,
  center: number,
  width: number,
): number {
  const w = Math.max(0.15, width);
  const dist = Math.abs(value - center) / w;
  return Math.max(0, 1 - dist * 0.85);
}

/**
 * 가성비: goods (rating) per priceBand relative to cohort median price.
 * Mid-band + solid rating wins over cheapest dump and expensive mediocre.
 */
function valueForMoneyScore(
  rating: number | null,
  priceBand: number | null,
  medianPrice: number | null,
  priceKrw: number | null,
  medianPriceKrw: number | null,
): number {
  const r = rating ?? 3.8;
  if (priceKrw != null && medianPriceKrw != null && medianPriceKrw > 0) {
    const relativePrice = Math.max(0.55, priceKrw / medianPriceKrw);
    const goods = Math.max(0.5, (r - 2.8) / 2.2);
    return Math.min(1.35, goods / relativePrice);
  }
  const band = priceBand ?? medianPrice ?? 2;
  const medianBand = medianPrice ?? 2;
  const relativePrice = Math.max(0.55, band / Math.max(0.75, medianBand));
  const goods = Math.max(0.5, (r - 2.8) / 2.2);
  return Math.min(1.35, goods / relativePrice);
}

function reviewTrustBonus(reviewCount: number | null, medianReviews: number | null): number {
  if (reviewCount == null) {
    return 0;
  }
  if (reviewCount < 8) {
    return -0.12;
  }
  const mid = medianReviews ?? 40;
  if (reviewCount >= mid) {
    return Math.min(0.18, 0.06 + (reviewCount - mid) / 400);
  }
  return 0.04;
}

function blandPenalty(row: ValueConsensusCandidate): number {
  const rating = finiteOrNull(row.rating);
  const band = finiteOrNull(row.priceBand);
  const walk = finiteOrNull(row.walkMinutes);
  const hasLocal = Boolean(row.localFavorite);
  const hasReservable = row.reservable !== false;
  let signals = 0;
  if (rating != null && (rating >= 4.4 || rating <= 3.6)) {
    signals += 1;
  }
  if (band != null && (band <= 1.5 || band >= 3.5)) {
    signals += 1;
  }
  if (walk != null && walk <= 8) {
    signals += 1;
  }
  if (hasLocal) {
    signals += 1;
  }
  if (!hasReservable) {
    return 0.22;
  }
  // Mid everything, no local — “매번 똑같고 별로”
  if (signals === 0) {
    return 0.28;
  }
  if (signals === 1 && (rating == null || (rating >= 3.85 && rating <= 4.15))) {
    return 0.14;
  }
  return 0;
}

function expensiveMediocrePenalty(
  rating: number | null,
  priceBand: number | null,
  medianPrice: number | null,
): number {
  if (rating == null || priceBand == null) {
    return 0;
  }
  const medianBand = medianPrice ?? 2;
  if (priceBand >= medianBand + 1.25 && rating < 4.25) {
    return 0.35 + Math.min(0.25, (priceBand - medianBand) * 0.08);
  }
  if (priceBand >= 3.5 && rating < 4.1) {
    return 0.3;
  }
  return 0;
}

export type ValueConsensusScoreDetail = {
  readonly total: number;
  readonly qualityNearCenter: number;
  readonly valueForMoney: number;
  readonly walkBubble: number;
  readonly localBonus: number;
  readonly reservableBonus: number;
  readonly blandPenalty: number;
  readonly expensiveMediocrePenalty: number;
};

export function scoreValueConsensusCandidate(
  row: ValueConsensusCandidate,
  cohort: {
    readonly ratingCenter: number;
    readonly priceMedian: number | null;
    readonly walkCenter: number | null;
    readonly reviewMedian: number | null;
    readonly priceKrwMedian: number | null;
  },
): ValueConsensusScoreDetail {
  const rating = finiteOrNull(row.rating);
  const priceBand = finiteOrNull(row.priceBand);
  const walk = finiteOrNull(row.walkMinutes);
  const reviewCount = finiteOrNull(row.reviewCount);
  const priceKrw = finiteOrNull(row.priceKrw);

  const qualityNearCenter =
    rating != null
      ? nearCenterScore(rating, cohort.ratingCenter, 0.55) * 0.55 +
        Math.max(0, Math.min(1, (rating - cohort.ratingCenter) / 0.8)) * 0.45
      : 0.35;

  const valueForMoney = valueForMoneyScore(
    rating,
    priceBand,
    cohort.priceMedian,
    priceKrw,
    cohort.priceKrwMedian,
  );

  const walkBubble =
    walk != null && cohort.walkCenter != null
      ? nearCenterScore(walk, cohort.walkCenter, 9) * 0.65 +
        (walk <= cohort.walkCenter ? 0.35 : Math.max(0, 0.35 - (walk - cohort.walkCenter) / 25))
      : walk != null
        ? walk <= 10
          ? 0.9
          : walk <= 18
            ? 0.55
            : 0.25
        : 0.4;

  const localBonus = row.localFavorite ? 0.12 : 0;
  const reservableBonus = row.reservable === false ? -0.18 : 0.06;
  const reviewBonus = reviewTrustBonus(reviewCount, cohort.reviewMedian);
  const bland = blandPenalty(row);
  const expensive = expensiveMediocrePenalty(
    rating,
    priceBand,
    cohort.priceMedian,
  );

  const total =
    qualityNearCenter * 1.15 +
    valueForMoney * 1.35 +
    walkBubble * 0.55 +
    localBonus +
    reservableBonus +
    reviewBonus -
    bland -
    expensive;

  return {
    total,
    qualityNearCenter,
    valueForMoney,
    walkBubble,
    localBonus,
    reservableBonus,
    blandPenalty: bland,
    expensiveMediocrePenalty: expensive,
  };
}

function buildCohort(rows: readonly ValueConsensusCandidate[]): {
  readonly ratingCenter: number;
  readonly priceMedian: number | null;
  readonly walkCenter: number | null;
  readonly reviewMedian: number | null;
  readonly priceKrwMedian: number | null;
} {
  const ratings = rows
    .map((r) => finiteOrNull(r.rating))
    .filter((v): v is number => v != null);
  const prices = rows
    .map((r) => finiteOrNull(r.priceBand))
    .filter((v): v is number => v != null);
  const walks = rows
    .map((r) => finiteOrNull(r.walkMinutes))
    .filter((v): v is number => v != null);
  const reviews = rows
    .map((r) => finiteOrNull(r.reviewCount))
    .filter((v): v is number => v != null);
  const pricesKrw = rows
    .map((r) => finiteOrNull(r.priceKrw))
    .filter((v): v is number => v != null);

  const ratingMedian = median(ratings);
  const ratingMean = mean(ratings);
  const ratingCenter =
    ratingMedian != null && ratingMean != null
      ? ratingMedian * 0.55 + ratingMean * 0.45
      : (ratingMedian ?? ratingMean ?? 4.2);

  return {
    ratingCenter,
    priceMedian: median(prices),
    walkCenter: median(walks) ?? mean(walks),
    reviewMedian: median(reviews),
    priceKrwMedian: median(pricesKrw),
  };
}

/**
 * Reorder candidates: strong consensus 가성비 first; bland / pricey-mediocre last.
 * Stable for equal scores (original index).
 */
export function rankByValueConsensus<T extends ValueConsensusCandidate>(
  rows: readonly T[],
): T[] {
  if (rows.length <= 1) {
    return [...rows];
  }
  const cohort = buildCohort(rows);
  return rows
    .map((row, index) => ({
      row,
      index,
      score: scoreValueConsensusCandidate(row, cohort).total,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}
