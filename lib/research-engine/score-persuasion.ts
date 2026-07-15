/**
 * 5-axis 납득도 (0..1) — real inventory signals, no hard A∩B∩C.
 *
 * 관측량 30 · 가격핏 25 · 동선 20 · 맥락 15 · 교차보너스 10
 * Missing axis = 0 contribution (not a penalty).
 */

import type { FastScanCandidate, RankedCandidate } from "@/engines/research/schema";
import { haversineKm } from "@/lib/feed/spacetime-fit";

export type PersuasionContext = {
  readonly message?: string | null;
  readonly maxNightlyPriceKrw?: number | null;
  readonly anchorLat?: number | null;
  readonly anchorLng?: number | null;
};

export type PersuasionAxisId =
  | "observation"
  | "priceFit"
  | "distance"
  | "context"
  | "crossCheck";

export type PersuasionAxisScore = {
  readonly id: PersuasionAxisId;
  readonly weight: number;
  readonly score: number;
  /** Present when this axis had real data to score. */
  readonly available: boolean;
  readonly labelKo: string;
};

export type PersuasionBreakdown = {
  readonly score: number;
  readonly axes: readonly PersuasionAxisScore[];
  readonly bulletsKo: readonly string[];
  /** One-line UI: 리뷰 210 · ★4.3 · 1박 약 9.8만 · 앵커 도보 8분 */
  readonly headlineKo: string;
};

const W = {
  observation: 0.3,
  priceFit: 0.25,
  distance: 0.2,
  context: 0.15,
  crossCheck: 0.1,
} as const;

function isInventoryDomain(domain: string): boolean {
  return /(?:\.rimvio$|inventory\.|discovery\.|live\.)/iu.test(domain);
}

function readNumberMeta(
  candidate: FastScanCandidate,
  key: string,
): number | null {
  const v = candidate.metadata?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function observationAxis(candidate: FastScanCandidate): PersuasionAxisScore {
  const reviewCount = candidate.reviewCount;
  const rating =
    candidate.popularity != null && Number.isFinite(candidate.popularity)
      ? candidate.popularity * 5
      : null;
  const hasReview =
    reviewCount != null && Number.isFinite(reviewCount) && reviewCount > 0;
  // Ignore near-zero popularity stubs — not a real star signal.
  const hasRating = rating != null && rating >= 3.0;

  if (!hasReview && !hasRating) {
    return {
      id: "observation",
      weight: W.observation,
      score: 0,
      available: false,
      labelKo: "관측량",
    };
  }

  let reviewScore = 0;
  if (hasReview) {
    if (reviewCount! >= 200) reviewScore = 1;
    else if (reviewCount! >= 80) reviewScore = 0.85;
    else if (reviewCount! >= 20) reviewScore = 0.65;
    else if (reviewCount! >= 5) reviewScore = 0.45;
    else reviewScore = 0.25;
  }
  let ratingScore = 0;
  if (hasRating) {
    // 3.5★ → 0.4 · 4.0 → 0.7 · 4.5 → 0.95
    ratingScore = Math.min(1, Math.max(0, (rating! - 3.2) / 1.5));
  }
  const score =
    hasReview && hasRating
      ? reviewScore * 0.55 + ratingScore * 0.45
      : hasReview
        ? reviewScore
        : ratingScore;

  const parts: string[] = [];
  if (hasReview) {
    parts.push(`리뷰 ${reviewCount!.toLocaleString("ko-KR")}`);
  }
  if (hasRating) {
    parts.push(`★${rating!.toFixed(1)}`);
  }

  return {
    id: "observation",
    weight: W.observation,
    score,
    available: true,
    labelKo: parts.join(" · ") || "관측량",
  };
}

function priceFitAxis(
  candidate: FastScanCandidate,
  maxNightlyPriceKrw: number | null | undefined,
): PersuasionAxisScore {
  const price = readNumberMeta(candidate, "priceKrw");
  if (price == null || price <= 0) {
    return {
      id: "priceFit",
      weight: W.priceFit,
      score: 0,
      available: false,
      labelKo: "가격",
    };
  }
  const man = Math.round(price / 10_000);
  const labelKo = `1박 약 ${man}만`;
  if (maxNightlyPriceKrw == null || maxNightlyPriceKrw <= 0) {
    // Have a real price band even without user cap — mild credit.
    return {
      id: "priceFit",
      weight: W.priceFit,
      score: 0.55,
      available: true,
      labelKo,
    };
  }
  const ratio = price / maxNightlyPriceKrw;
  let score = 0;
  if (ratio <= 0.85) score = 1;
  else if (ratio <= 1.0) score = 0.9;
  else if (ratio <= 1.15) score = 0.65;
  else if (ratio <= 1.35) score = 0.35;
  else score = 0.1;

  return {
    id: "priceFit",
    weight: W.priceFit,
    score,
    available: true,
    labelKo:
      ratio <= 1.15
        ? `${labelKo} (예산 핏)`
        : `${labelKo} (예산 대비 높음)`,
  };
}

function distanceAxis(
  candidate: FastScanCandidate,
  anchorLat: number | null | undefined,
  anchorLng: number | null | undefined,
): PersuasionAxisScore {
  const lat = readNumberMeta(candidate, "lat");
  const lng = readNumberMeta(candidate, "lng");
  if (
    lat == null ||
    lng == null ||
    anchorLat == null ||
    anchorLng == null ||
    !Number.isFinite(anchorLat) ||
    !Number.isFinite(anchorLng)
  ) {
    return {
      id: "distance",
      weight: W.distance,
      score: 0,
      available: false,
      labelKo: "동선",
    };
  }
  const km = haversineKm(anchorLat, anchorLng, lat, lng);
  const walkMin = Math.max(1, Math.round((km * 1000) / 80));
  let score = 0;
  if (km <= 0.5) score = 1;
  else if (km <= 1.2) score = 0.85;
  else if (km <= 2.5) score = 0.65;
  else if (km <= 5) score = 0.4;
  else if (km <= 10) score = 0.2;
  else score = 0.08;

  return {
    id: "distance",
    weight: W.distance,
    score,
    available: true,
    labelKo:
      walkMin <= 25
        ? `앵커 도보 약 ${walkMin}분`
        : `앵커 ${km < 10 ? km.toFixed(1) : Math.round(km)}km`,
  };
}

function contextAxis(
  candidate: FastScanCandidate,
  message: string | null | undefined,
): PersuasionAxisScore {
  const snippet = candidate.snippet.trim();
  const msg = message?.trim() ?? "";
  if (!snippet && !msg) {
    return {
      id: "context",
      weight: W.context,
      score: 0,
      available: false,
      labelKo: "맥락",
    };
  }

  let score = 0.35;
  if (snippet.length < 8) {
    return {
      id: "context",
      weight: W.context,
      score: 0,
      available: false,
      labelKo: "맥락",
    };
  }
  if (snippet.length >= 28) score += 0.2;
  if (snippet.length >= 60) score += 0.1;

  const tokens =
    msg.match(
      /호텔|숙소|캡슐|게스트|맛집|카페|놀거리|가성비|저렴|비싸|조용|역|신주쿠|시부야|도쿄|오사카/giu,
    ) ?? [];
  const blob = `${candidate.title} ${snippet}`.toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (blob.includes(token.toLowerCase())) {
      hits += 1;
    }
  }
  if (tokens.length > 0) {
    score += Math.min(0.35, (hits / tokens.length) * 0.35);
  }
  if (/(?:좋|추천|만족|깔끔|가성비|편리|가깝)/iu.test(snippet)) {
    score += 0.1;
  }

  return {
    id: "context",
    weight: W.context,
    score: Math.min(1, score),
    available: true,
    labelKo: snippet.length >= 12 ? `맥락: ${snippet.slice(0, 36)}` : "맥락 적합",
  };
}

function crossCheckAxis(
  candidate: FastScanCandidate,
  kept: readonly RankedCandidate[],
): PersuasionAxisScore {
  const hasReviews =
    candidate.reviewCount != null &&
    Number.isFinite(candidate.reviewCount) &&
    candidate.reviewCount > 0;
  const hasPrice = readNumberMeta(candidate, "priceKrw") != null;
  const hasCoords =
    readNumberMeta(candidate, "lat") != null &&
    readNumberMeta(candidate, "lng") != null;
  const hasInventory = isInventoryDomain(candidate.domain);
  const yt =
    readNumberMeta(candidate, "youtubeConfidence") ??
    (candidate.metadata?.ytPreview === true ? 0.6 : null);
  const signals = [
    hasReviews,
    hasPrice,
    hasCoords,
    hasInventory,
    yt != null && yt >= 0.55,
  ].filter(Boolean).length;
  const multiKeep = kept.length >= 2;

  if (signals < 2 && !multiKeep) {
    return {
      id: "crossCheck",
      weight: W.crossCheck,
      score: 0,
      available: false,
      labelKo: "교차",
    };
  }

  let score = Math.min(1, signals * 0.28);
  if (multiKeep) score = Math.min(1, score + 0.2);
  if (signals >= 3) score = Math.min(1, score + 0.15);
  if (yt != null && yt >= 0.7) score = Math.min(1, score + 0.1);

  return {
    id: "crossCheck",
    weight: W.crossCheck,
    score,
    available: true,
    labelKo:
      yt != null && yt >= 0.55
        ? `영상 교차 ${(yt * 100).toFixed(0)}%`
        : signals >= 3
          ? "리뷰·가격·좌표 교차"
          : multiKeep
            ? "후보 비교 + 신호"
            : "교차 신호",
  };
}

/**
 * Soft 납득도 from ranked kept candidates.
 * Missing axes contribute 0 — never hard-fail.
 */
export function scoreResearchPersuasion(
  ranked: readonly RankedCandidate[],
  context: PersuasionContext = {},
): PersuasionBreakdown {
  const kept = ranked.filter((row) => !row.rejected);
  if (kept.length === 0) {
    return {
      score: 0.08,
      axes: [],
      bulletsKo: ["아직 비교할 후보가 없습니다"],
      headlineKo: "납득 신호 없음",
    };
  }

  const best = kept[0]!.candidate;
  const axes: PersuasionAxisScore[] = [
    observationAxis(best),
    priceFitAxis(best, context.maxNightlyPriceKrw),
    distanceAxis(best, context.anchorLat, context.anchorLng),
    contextAxis(best, context.message),
    crossCheckAxis(best, kept),
  ];

  // Renormalize over available axes so empty distance/price don't crush the score.
  const available = axes.filter((a) => a.available);
  let score: number;
  if (available.length === 0) {
    score = 0.12;
  } else {
    const weightSum = available.reduce((s, a) => s + a.weight, 0);
    score =
      available.reduce((s, a) => s + a.score * a.weight, 0) /
      Math.max(0.01, weightSum);
  }
  score = Math.max(0.08, Math.min(0.95, score));

  const headlineParts = available
    .filter((a) => a.id !== "crossCheck" && a.id !== "context")
    .map((a) => a.labelKo);
  if (available.find((a) => a.id === "context")?.score && best.snippet.trim()) {
    // keep context out of headline — too long; bullets cover it
  }
  const headlineKo =
    headlineParts.length > 0
      ? headlineParts.slice(0, 4).join(" · ")
      : `「${best.title}」`;

  const bulletsKo: string[] = [];
  for (const axis of available) {
    if (axis.score <= 0) continue;
    if (axis.id === "observation") {
      bulletsKo.push(`${axis.labelKo} 관측`);
    } else if (axis.id === "priceFit") {
      bulletsKo.push(axis.labelKo);
    } else if (axis.id === "distance") {
      bulletsKo.push(axis.labelKo);
    } else if (axis.id === "context" && best.snippet.trim().length >= 12) {
      bulletsKo.push(`근거: ${best.snippet.trim().slice(0, 64)}`);
    } else if (axis.id === "crossCheck") {
      bulletsKo.push(axis.labelKo);
    }
  }
  if (kept.length >= 2) {
    bulletsKo.push(`대안 ${kept.length - 1}곳과 비교`);
  }
  if (bulletsKo.length === 0) {
    bulletsKo.push(`「${best.title}」을(를) 먼저 살펴보세요`);
  }

  return {
    score,
    axes,
    bulletsKo: bulletsKo.slice(0, 5),
    headlineKo,
  };
}
