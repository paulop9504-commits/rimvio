import type { ResearchTool } from "@/lib/research-engine/tools/types";

function readMeta(
  metadata: Record<string, string | number | boolean | null> | undefined,
  key: string,
): number | null {
  const v = metadata?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const RATING_RE = /(?:★|별점|rating)\s*([0-5](?:\.\d)?)/iu;
const REVIEW_RE = /리뷰\s*([\d,]+)|([\d,]+)\s*reviews?/iu;

/** Soft Places details — snippet parse + optional runtime fetch. */
export const placesDetailsTool: ResearchTool = {
  id: "places_details",
  labelKo: "장소 상세",
  async run({ candidate, ranked, context }) {
    let rating: number | null =
      candidate.popularity != null && candidate.popularity >= 0.6
        ? candidate.popularity * 5
        : null;
    let reviewCount: number | null =
      candidate.reviewCount != null && candidate.reviewCount > 0
        ? candidate.reviewCount
        : null;
    let lat = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "lat",
    );
    let lng = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "lng",
    );
    let priceKrw = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "priceKrw",
    );

    const ratingHit = candidate.snippet.match(RATING_RE);
    if (rating == null && ratingHit?.[1]) {
      rating = Number(ratingHit[1]);
    }
    const reviewHit = candidate.snippet.match(REVIEW_RE);
    if (reviewCount == null && (reviewHit?.[1] || reviewHit?.[2])) {
      reviewCount = Number(String(reviewHit[1] ?? reviewHit[2]).replace(/,/g, ""));
    }

    // Peer inventory row with same id / similar title
    if (reviewCount == null || lat == null) {
      for (const peer of ranked) {
        if (peer.rejected || peer.candidate.id === candidate.id) {
          continue;
        }
        const sameId = peer.candidate.id === candidate.id;
        const titleClose =
          peer.candidate.title.trim().toLowerCase() ===
          candidate.title.trim().toLowerCase();
        if (!sameId && !titleClose) {
          continue;
        }
        if (reviewCount == null && peer.candidate.reviewCount) {
          reviewCount = peer.candidate.reviewCount;
        }
        if (rating == null && peer.candidate.popularity != null) {
          rating = peer.candidate.popularity * 5;
        }
        const pLat = readMeta(
          peer.candidate.metadata as
            | Record<string, string | number | boolean | null>
            | undefined,
          "lat",
        );
        const pLng = readMeta(
          peer.candidate.metadata as
            | Record<string, string | number | boolean | null>
            | undefined,
          "lng",
        );
        if (lat == null && pLat != null) lat = pLat;
        if (lng == null && pLng != null) lng = pLng;
        const pPrice = readMeta(
          peer.candidate.metadata as
            | Record<string, string | number | boolean | null>
            | undefined,
          "priceKrw",
        );
        if (priceKrw == null && pPrice != null) priceKrw = pPrice;
      }
    }

    if (context.runtime?.fetchPlacesDetails) {
      try {
        const fetched = await context.runtime.fetchPlacesDetails({
          title: candidate.title,
          placeId: candidate.id,
          lat,
          lng,
          anchorLat: context.persuasion.anchorLat,
          anchorLng: context.persuasion.anchorLng,
          domain: candidate.domain,
        });
        if (fetched) {
          if (fetched.rating != null) rating = fetched.rating;
          if (fetched.reviewCount != null) reviewCount = fetched.reviewCount;
          if (fetched.lat != null) lat = fetched.lat;
          if (fetched.lng != null) lng = fetched.lng;
          if (fetched.priceKrw != null) priceKrw = fetched.priceKrw;
        }
      } catch {
        // soft
      }
    }

    const filled = [];
    if (reviewCount != null && reviewCount > 0) filled.push("observation" as const);
    if (lat != null && lng != null) filled.push("distance" as const);
    if (priceKrw != null && priceKrw > 0) filled.push("priceFit" as const);

    const hadImprovement =
      (reviewCount != null &&
        reviewCount > 0 &&
        (candidate.reviewCount == null || candidate.reviewCount <= 0)) ||
      (rating != null &&
        rating >= 3 &&
        (candidate.popularity == null || candidate.popularity < 0.6)) ||
      (lat != null &&
        lng != null &&
        (readMeta(
          candidate.metadata as Record<string, string | number | boolean | null> | undefined,
          "lat",
        ) == null ||
          readMeta(
            candidate.metadata as Record<string, string | number | boolean | null> | undefined,
            "lng",
          ) == null));

    const calledArgs = {
      title: candidate.title,
      placeId: candidate.id,
      lat: lat ?? context.persuasion.anchorLat ?? null,
      lng: lng ?? context.persuasion.anchorLng ?? null,
    };

    if (!hadImprovement && filled.length === 0) {
      return {
        toolId: "places_details",
        candidateId: candidate.id,
        status: "skip",
        summaryKo: "places_details: 새 관측 없음",
        filledAxes: [],
        patch: null,
        evidence: {
          called: "places.reviews",
          args: calledArgs,
          got: null,
          gotLine: "empty",
        },
      };
    }

    if (!hadImprovement && (candidate.reviewCount ?? 0) > 0) {
      return {
        toolId: "places_details",
        candidateId: candidate.id,
        status: "skip",
        summaryKo: "places_details: 관측 이미 충분 — 생략",
        filledAxes: ["observation"],
        patch: null,
        evidence: {
          called: "places.reviews",
          args: calledArgs,
          got: {
            reviews: candidate.reviewCount ?? null,
            rating:
              candidate.popularity != null
                ? Math.round(candidate.popularity * 50) / 10
                : null,
          },
          gotLine: "already_have",
        },
      };
    }

    const parts: string[] = [];
    if (reviewCount != null && reviewCount > 0) {
      parts.push(`reviews=${reviewCount}`);
    }
    if (rating != null && rating >= 3) {
      parts.push(`★${rating.toFixed(1)}`);
    }
    if (lat != null && lng != null) {
      parts.push(`coords=${lat.toFixed(3)},${lng.toFixed(3)}`);
    }

    return {
      toolId: "places_details",
      candidateId: candidate.id,
      status: "ok",
      summaryKo: `places_details: ${parts.join(" · ") || "좌표/메타 보강"}`,
      filledAxes: filled,
      patch: {
        reviewCount: reviewCount ?? candidate.reviewCount ?? null,
        popularity:
          rating != null && rating > 0
            ? Math.min(1, rating / 5)
            : candidate.popularity ?? null,
        metadata: {
          lat: lat ?? null,
          lng: lng ?? null,
          priceKrw: priceKrw ?? null,
          placesDetails: true,
        },
        snippetAppend:
          reviewCount != null && reviewCount > 0
            ? [`리뷰 ${reviewCount}`, rating != null && rating >= 3 ? `★${rating.toFixed(1)}` : null]
                .filter(Boolean)
                .join(" · ")
            : parts.length > 0
              ? parts.join(" · ")
              : null,
      },
      evidence: {
        called: "places.reviews",
        args: calledArgs,
        got: {
          reviews: reviewCount,
          rating: rating != null ? Math.round(rating * 10) / 10 : null,
          lat,
          lng,
          priceKrw,
        },
        gotLine: parts.join(" · ") || "meta",
      },
    };
  },
};
