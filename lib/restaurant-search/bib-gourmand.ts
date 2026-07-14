import type { RestaurantSearchCountryBias } from "@/lib/restaurant-search/types";
import type { RestaurantSearchCandidate } from "@/lib/restaurant-search/types";

/** User-facing badge for Michelin Bib Gourmand hits. */
export const BIB_GOURMAND_REASON_KO = "빕 구르망";

/** Soft boost so Bib rows can surface without dominating the list. */
export const BIB_GOURMAND_SEARCH_SCORE_BOOST = 14;

const BIB_TEXT_PATTERN =
  /bib\s*gourmand|빕\s*구르망|빕구르망|ビブグルマン|ビブ\s*グルマン|미쉐린\s*빕|ミシュラン\s*ビブ/iu;

export function isBibGourmandMarked(
  candidate: Pick<
    RestaurantSearchCandidate,
    "specialReasonKo" | "name" | "description" | "categoryLabel"
  >,
): boolean {
  if (candidate.specialReasonKo?.trim() === BIB_GOURMAND_REASON_KO) {
    return true;
  }
  const blob = [
    candidate.specialReasonKo,
    candidate.name,
    candidate.description,
    candidate.categoryLabel,
  ]
    .filter(Boolean)
    .join(" ");
  return BIB_TEXT_PATTERN.test(blob);
}

export function bibGourmandQueryForBias(
  countryBias: RestaurantSearchCountryBias,
  areaLabel?: string | null,
): string {
  const area = areaLabel?.trim() || "";
  const guide =
    countryBias === "jp"
      ? "ミシュラン ビブグルマン"
      : countryBias === "kr"
        ? "미쉐린 빕 구르망"
        : "Michelin Bib Gourmand";
  return `${area} ${guide}`.trim();
}

export function markBibGourmandCandidate(
  candidate: RestaurantSearchCandidate,
): RestaurantSearchCandidate {
  return {
    ...candidate,
    specialReasonKo: BIB_GOURMAND_REASON_KO,
    specialScore: Math.max(
      candidate.specialScore ?? 0,
      BIB_GOURMAND_SEARCH_SCORE_BOOST,
    ),
    searchScore:
      (candidate.searchScore ?? 0) +
      (isBibGourmandMarked(candidate) ? 0 : BIB_GOURMAND_SEARCH_SCORE_BOOST),
  };
}

/**
 * Merge Bib hits into the ranked meal list when available.
 * Caps at 2 interleaved slots so the feed stays mixed, not guide-only.
 */
export function mixBibGourmandIntoCandidates(input: {
  ranked: readonly RestaurantSearchCandidate[];
  bibHits: readonly RestaurantSearchCandidate[];
  maxResults: number;
}): RestaurantSearchCandidate[] {
  const maxResults = Math.max(1, input.maxResults);
  const ranked = input.ranked.map((row) =>
    isBibGourmandMarked(row) ? markBibGourmandCandidate(row) : row,
  );
  const bibMarked = input.bibHits.map(markBibGourmandCandidate);
  if (bibMarked.length === 0) {
    return ranked.slice(0, maxResults);
  }

  const byId = new Map<string, RestaurantSearchCandidate>();
  for (const row of ranked) {
    byId.set(row.placeId, row);
  }

  const freshBib: RestaurantSearchCandidate[] = [];
  for (const hit of bibMarked) {
    const existing = byId.get(hit.placeId);
    if (existing) {
      byId.set(hit.placeId, markBibGourmandCandidate(existing));
      continue;
    }
    // Name-near duplicate: upgrade the ranked twin instead of adding a clone.
    const twin = ranked.find(
      (row) =>
        row.name.trim().toLowerCase() === hit.name.trim().toLowerCase() ||
        normalizeLoose(row.name) === normalizeLoose(hit.name),
    );
    if (twin) {
      byId.set(twin.placeId, markBibGourmandCandidate({ ...twin, ...pickEnrichment(hit) }));
      continue;
    }
    freshBib.push(hit);
  }

  const base = ranked.map((row) => byId.get(row.placeId) ?? row);
  if (freshBib.length === 0) {
    return base.slice(0, maxResults);
  }

  const mixCap = Math.min(2, freshBib.length);
  const insertSlots =
    maxResults >= 5 ? [1, 3] : maxResults >= 3 ? [1] : [0];
  const usedSlots = insertSlots.slice(0, mixCap);
  const out: RestaurantSearchCandidate[] = [];
  const seen = new Set<string>();
  let bibIndex = 0;

  for (let i = 0; i < maxResults; i++) {
    if (usedSlots.includes(i) && bibIndex < mixCap) {
      const nextBib = freshBib[bibIndex]!;
      bibIndex += 1;
      if (!seen.has(nextBib.placeId)) {
        out.push(nextBib);
        seen.add(nextBib.placeId);
        continue;
      }
    }
    while (base.length > 0) {
      const next = base.shift()!;
      if (seen.has(next.placeId)) {
        continue;
      }
      out.push(next);
      seen.add(next.placeId);
      break;
    }
  }

  // Fill remaining with leftover bib / base if short.
  for (const row of [...freshBib.slice(bibIndex), ...base]) {
    if (out.length >= maxResults) {
      break;
    }
    if (seen.has(row.placeId)) {
      continue;
    }
    out.push(row);
    seen.add(row.placeId);
  }

  return out.slice(0, maxResults);
}

function normalizeLoose(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "");
}

function pickEnrichment(
  hit: RestaurantSearchCandidate,
): Partial<RestaurantSearchCandidate> {
  return {
    images: hit.images.length > 0 ? hit.images : undefined,
    address: hit.address,
    rating: hit.rating,
    mapsUrl: hit.mapsUrl,
    specialReasonKo: BIB_GOURMAND_REASON_KO,
  };
}
