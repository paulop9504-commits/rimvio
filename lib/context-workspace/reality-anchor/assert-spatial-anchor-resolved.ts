/**
 * Slice A — fail-closed Spatial Anchor policy.
 * Near-scout must not invent Osaka/Namba when Anchor is unresolved.
 * @see docs/RIMVIO_REALITY_ANCHOR_PROJECTION.md
 */

import type { RealityAnchorHit } from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";

export type SpatialAnchorFailCode =
  | "ANCHOR_NOT_FOUND"
  | "ANCHOR_AMBIGUOUS"
  | "ANCHOR_CITY_REJECTED"
  | "NO_NEAR_CONSTRAINT";

export type SpatialAnchorCandidateChip = {
  readonly labelKo: string;
  readonly utterance?: string;
};

export type AssertSpatialAnchorResolvedOk = {
  readonly ok: true;
  readonly anchor: {
    readonly id: string;
    readonly labelKo: string;
    readonly lat: number;
    readonly lng: number;
    readonly kind: string;
  };
};

export type AssertSpatialAnchorResolvedFail = {
  readonly ok: false;
  readonly code: SpatialAnchorFailCode;
  readonly statusKo: string;
  readonly candidates: readonly SpatialAnchorCandidateChip[];
};

export type AssertSpatialAnchorResolvedResult =
  | AssertSpatialAnchorResolvedOk
  | AssertSpatialAnchorResolvedFail;

/** Targets that share the same near-scout gate (not hotel-only). */
const NEAR_SCOUT_TARGET_RE =
  /숙소|호텔|hotel|lodging|캡슐|료칸|맛집|식당|레스토랑|이자카야|카페|cafe|커피|명소|관광|놀거리|볼거리|poi|약국|편의점|쇼핑|마트|아울렛|restaurant/iu;

/**
 * 「X 근처 Y」— Y is any scout target. Shared gate for lodging / eatery / poi / …
 */
export function isNearScoutUtterance(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /근처|주변|near|around|기준으로|기준\s/iu.test(t) &&
    NEAR_SCOUT_TARGET_RE.test(t)
  );
}

/**
 * Thin policy: near-constraint requires a concrete lat/lng Anchor.
 * City-level hits are rejected (too coarse for near scout).
 */
export function assertSpatialAnchorResolved(input: {
  readonly hasNearConstraint: boolean;
  readonly anchor: RealityAnchorHit | null | undefined;
  readonly nearLabelKo?: string | null;
  readonly candidates?: readonly SpatialAnchorCandidateChip[];
}): AssertSpatialAnchorResolvedResult {
  if (!input.hasNearConstraint) {
    return {
      ok: false,
      code: "NO_NEAR_CONSTRAINT",
      statusKo: "근처 조건이 없어요",
      candidates: [],
    };
  }

  const candidates = input.candidates ?? [];
  if (candidates.length >= 2 && !input.anchor) {
    const labels = candidates
      .slice(0, 3)
      .map((c) => c.labelKo)
      .join(" · ");
    return {
      ok: false,
      code: "ANCHOR_AMBIGUOUS",
      statusKo: `어느 곳인지 골라 주세요 · ${labels}`,
      candidates: candidates.slice(0, 3),
    };
  }

  const anchor = input.anchor;
  const labelHint = input.nearLabelKo?.trim() || "그곳";

  if (
    !anchor ||
    !Number.isFinite(anchor.lat) ||
    !Number.isFinite(anchor.lng)
  ) {
    return {
      ok: false,
      code: "ANCHOR_NOT_FOUND",
      statusKo: `${labelHint} 위치를 정확히 확인하지 못했어요`,
      candidates: candidates.slice(0, 3),
    };
  }

  if (anchor.kind === "city") {
    return {
      ok: false,
      code: "ANCHOR_CITY_REJECTED",
      statusKo: `${anchor.labelKo}은(는) 너무 넓어요 · 역·명소처럼 구체적인 기준으로 말해 주세요`,
      candidates: [],
    };
  }

  return {
    ok: true,
    anchor: {
      id: anchor.geoId,
      labelKo: anchor.labelKo,
      lat: anchor.lat,
      lng: anchor.lng,
      kind: anchor.kind,
    },
  };
}
