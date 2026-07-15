/**
 * Field-level evidence gaps — Cursor-like missing → tool target.
 * Not "skip axis"; name the empty field then pick an instrument.
 */

import type { FastScanCandidate, RankedCandidate } from "@/engines/research/schema";
import type { PersuasionAxisId, PersuasionContext } from "@/lib/research-engine/score-persuasion";
import type { ResearchToolGap, ResearchToolId } from "@/lib/research-engine/tools/types";

export type ResearchMissingField =
  | "reviewCount"
  | "rating"
  | "priceKrw"
  | "coords"
  | "distanceKm"
  | "youtubeConfidence";

export type ResearchFieldGap = {
  readonly field: ResearchMissingField;
  readonly axisId: PersuasionAxisId;
  readonly reasonKo: string;
  /** Canonical wire phrase: missing:reviewCount */
  readonly missingKey: `missing:${ResearchMissingField}`;
};

function readMeta(
  candidate: FastScanCandidate,
  key: string,
): number | null {
  const v = candidate.metadata?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function hasRating(candidate: FastScanCandidate): boolean {
  return (
    candidate.popularity != null &&
    Number.isFinite(candidate.popularity) &&
    candidate.popularity >= 0.6
  );
}

function hasReviews(candidate: FastScanCandidate): boolean {
  return (
    candidate.reviewCount != null &&
    Number.isFinite(candidate.reviewCount) &&
    candidate.reviewCount > 0
  );
}

/** Concrete empty fields on the best kept candidate. */
export function detectResearchMissingFields(input: {
  ranked: readonly RankedCandidate[];
  persuasionContext: PersuasionContext;
}): ResearchFieldGap[] {
  const kept = input.ranked.filter((r) => !r.rejected);
  const best = kept[0]?.candidate;
  if (!best) {
    return [
      {
        field: "reviewCount",
        axisId: "observation",
        reasonKo: "후보가 없어 관측 필드가 비었습니다",
        missingKey: "missing:reviewCount",
      },
    ];
  }

  const gaps: ResearchFieldGap[] = [];

  if (!hasReviews(best)) {
    gaps.push({
      field: "reviewCount",
      axisId: "observation",
      reasonKo: "reviewCount 없음",
      missingKey: "missing:reviewCount",
    });
  }
  if (!hasRating(best)) {
    gaps.push({
      field: "rating",
      axisId: "observation",
      reasonKo: "별점(rating) 없음",
      missingKey: "missing:rating",
    });
  }

  const priceKrw = readMeta(best, "priceKrw");
  const budget = input.persuasionContext.maxNightlyPriceKrw;
  if (priceKrw == null || priceKrw <= 0) {
    // Always chase price when budget is in play, or whenever empty on lodging-ish rows.
    if (budget != null || /lodging|hotel|숙|inventory/iu.test(best.domain)) {
      gaps.push({
        field: "priceKrw",
        axisId: "priceFit",
        reasonKo: "priceKrw 없음",
        missingKey: "missing:priceKrw",
      });
    }
  }

  const lat = readMeta(best, "lat");
  const lng = readMeta(best, "lng");
  const hasCoords = lat != null && lng != null;
  if (!hasCoords) {
    gaps.push({
      field: "coords",
      axisId: "distance",
      reasonKo: "lat/lng 없음",
      missingKey: "missing:coords",
    });
  }

  const hasAnchor =
    input.persuasionContext.anchorLat != null &&
    input.persuasionContext.anchorLng != null;
  const distanceKm = readMeta(best, "distanceKm");
  if (hasAnchor && hasCoords && (distanceKm == null || distanceKm < 0)) {
    gaps.push({
      field: "distanceKm",
      axisId: "distance",
      reasonKo: "distanceKm 미계산",
      missingKey: "missing:distanceKm",
    });
  }

  const yt = readMeta(best, "youtubeConfidence");
  if (yt == null || yt < 0.55) {
    gaps.push({
      field: "youtubeConfidence",
      axisId: "crossCheck",
      reasonKo: "youtubeConfidence 약함/없음",
      missingKey: "missing:youtubeConfidence",
    });
  }

  return gaps;
}

/** Map a missing field → one named tool (coords without anchor still → places_details). */
export function toolForMissingField(input: {
  field: ResearchMissingField;
  hasCoords: boolean;
  hasAnchor: boolean;
}): ResearchToolId {
  switch (input.field) {
    case "reviewCount":
    case "rating":
    case "coords":
      return "places_details";
    case "priceKrw":
      return "rate_lookup";
    case "distanceKm":
      return input.hasCoords && input.hasAnchor
        ? "distance_check"
        : "places_details";
    case "youtubeConfidence":
      return "yt_preview";
    default:
      return "places_details";
  }
}

/** Convert field gaps → axis gaps for tool.run context / strategy reorder. */
export function fieldGapsToAxisGaps(
  fields: readonly ResearchFieldGap[],
): ResearchToolGap[] {
  const seen = new Set<PersuasionAxisId>();
  const out: ResearchToolGap[] = [];
  for (const f of fields) {
    if (seen.has(f.axisId)) continue;
    seen.add(f.axisId);
    out.push({
      axisId: f.axisId,
      reasonKo: `${f.missingKey} — ${f.reasonKo}`,
    });
  }
  return out;
}

/** Fields closed between two snapshots (before − after). */
export function closedMissingFields(
  before: readonly ResearchFieldGap[],
  after: readonly ResearchFieldGap[],
): ResearchMissingField[] {
  const afterSet = new Set(after.map((f) => f.field));
  return before
    .map((f) => f.field)
    .filter((field) => !afterSet.has(field));
}
