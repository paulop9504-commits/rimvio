/**
 * Post-score diversity — avoid Hilton/same-chain or same-cuisine walls.
 * Deterministic MMR-ish pick: relevance λ vs novelty (1-λ).
 */

function normalizeBrandToken(name: string): string {
  const raw = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, " ")
    .trim();
  if (!raw) {
    return "";
  }
  const known =
    raw.match(
      /\b(hilton|marriott|hyatt|sheraton|intercontinental|holiday\s*inn|novotel|ibis|premier\s*inn|리츠|힐튼|메리어트|하얏트|쉐라톤|노보텔|이비스)\b/u,
    )?.[0] ?? null;
  if (known) {
    return known.replace(/\s+/gu, "");
  }
  const first = raw.split(/\s+/u)[0] ?? raw;
  return first.slice(0, 10);
}

function distanceBand(lat: number, lng: number, originLat: number, originLng: number): number {
  const dLat = (lat - originLat) * 111;
  const dLng = (lng - originLng) * 88;
  const km = Math.hypot(dLat, dLng);
  if (km < 0.4) return 0;
  if (km < 1.2) return 1;
  if (km < 3) return 2;
  return 3;
}

export type DiversifyPlaceRow = {
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  readonly categoryHint?: string | null;
};

/** Reorder scored rows for a more varied shortlist. */
export function diversifyScoredRecommendations<T extends { score: number; row: DiversifyPlaceRow }>(
  scored: readonly T[],
  input?: {
    originLat?: number | null;
    originLng?: number | null;
    /** 0..1 — higher keeps score order more. Default 0.62. */
    lambda?: number;
  },
): T[] {
  if (scored.length <= 2) {
    return [...scored];
  }
  const lambda = input?.lambda ?? 0.62;
  const originLat = input?.originLat;
  const originLng = input?.originLng;
  const remaining = [...scored];
  const picked: T[] = [];
  const usedBrands = new Set<string>();
  const usedBands = new Set<number>();
  const usedCategories = new Set<string>();

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i]!;
      const brand = normalizeBrandToken(candidate.row.name);
      const category = (candidate.row.categoryHint ?? "").trim().toLowerCase().slice(0, 12);
      const band =
        originLat != null &&
        originLng != null &&
        Number.isFinite(candidate.row.lat) &&
        Number.isFinite(candidate.row.lng)
          ? distanceBand(candidate.row.lat, candidate.row.lng, originLat, originLng)
          : -1;
      let novelty = 1;
      if (brand && usedBrands.has(brand)) {
        novelty -= 0.55;
      }
      if (band >= 0 && usedBands.has(band) && picked.length < 3) {
        novelty -= 0.18;
      }
      if (category && usedCategories.has(category)) {
        novelty -= 0.22;
      }
      const value = lambda * candidate.score + (1 - lambda) * (novelty * 100);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0]!;
    picked.push(next);
    const brand = normalizeBrandToken(next.row.name);
    if (brand) {
      usedBrands.add(brand);
    }
    const category = (next.row.categoryHint ?? "").trim().toLowerCase().slice(0, 12);
    if (category) {
      usedCategories.add(category);
    }
    if (
      originLat != null &&
      originLng != null &&
      Number.isFinite(next.row.lat) &&
      Number.isFinite(next.row.lng)
    ) {
      usedBands.add(distanceBand(next.row.lat, next.row.lng, originLat, originLng));
    }
  }

  return picked;
}

/** Soft score penalty for global chains (leisure discovery). */
export function lodgingChainScorePenalty(name: string): number {
  const token = normalizeBrandToken(name);
  if (
    /hilton|marriott|hyatt|sheraton|intercontinental|힐튼|메리어트|하얏트|쉐라톤/.test(
      token,
    )
  ) {
    return 12;
  }
  return 0;
}
