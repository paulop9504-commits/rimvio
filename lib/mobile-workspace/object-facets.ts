/**
 * Object Facets — price / review / why / nearby attached to one entity.
 * Tap a facet → expand that facet only (no multi floating windows).
 */

import { formatHotelPriceDisplayKo } from "@/lib/globe/context-hub/format-lodging-nightly-price";
import type {
  MobileWorkspaceEntity,
  MobileWorkspaceRelation,
} from "@/lib/mobile-workspace/types";

function hotelPricePreviewKo(entity: MobileWorkspaceEntity): string | null {
  const price = formatHotelPriceDisplayKo(entity.priceLabelKo);
  if (!price) return null;
  if (entity.kind === "hotel" && price.perNightSuffix) {
    return `${price.amountKo} / 1박`;
  }
  return price.amountKo;
}

export const OBJECT_FACET_IDS = [
  "price",
  "review",
  "why",
  "nearby",
] as const;

export type ObjectFacetId = (typeof OBJECT_FACET_IDS)[number];

export type ObjectFacetChip = {
  readonly id: ObjectFacetId;
  readonly labelKo: string;
  readonly previewKo: string;
};

export type ObjectFacetDetail = {
  readonly id: ObjectFacetId;
  readonly titleKo: string;
  readonly linesKo: readonly string[];
  readonly tagsKo: readonly string[];
};

const LABELS: Record<ObjectFacetId, string> = {
  price: "가격",
  review: "리뷰",
  why: "왜 추천",
  nearby: "주변",
};

export function buildObjectFacetChips(
  entity: MobileWorkspaceEntity,
): readonly ObjectFacetChip[] {
  return [
    {
      id: "price",
      labelKo: LABELS.price,
      previewKo: hotelPricePreviewKo(entity) || "가격 보기",
    },
    {
      id: "review",
      labelKo: LABELS.review,
      previewKo:
        entity.score != null
          ? entity.score >= 10
            ? `★ ${(entity.score / 10).toFixed(1)}`
            : `${entity.score}%`
          : "리뷰 보기",
    },
    {
      id: "why",
      labelKo: LABELS.why,
      previewKo: "추천 이유",
    },
    {
      id: "nearby",
      labelKo: LABELS.nearby,
      previewKo: "주변 정보",
    },
  ];
}

export function buildObjectFacetDetail(input: {
  readonly entity: MobileWorkspaceEntity;
  readonly facetId: ObjectFacetId;
  readonly relations?: readonly MobileWorkspaceRelation[];
  readonly whyLinesKo?: readonly string[] | null;
}): ObjectFacetDetail {
  const { entity, facetId } = input;
  const relations = input.relations ?? [];

  if (facetId === "price") {
    const pricePreview = hotelPricePreviewKo(entity);
    return {
      id: "price",
      titleKo: "가격",
      linesKo: [
        pricePreview
          ? `현재가 · ${pricePreview}`
          : "가격 정보가 아직 없어요",
        entity.kind === "hotel"
          ? "1박 기준 · Prepare로 예약 후보만 준비 · Commit은 직접"
          : "가격은 Workspace Draft 기준이에요",
      ],
      tagsKo: entity.priceLabelKo ? ["실시간", "Draft"] : ["확인 필요"],
    };
  }

  if (facetId === "review") {
    const scoreLine =
      entity.score != null
        ? entity.score >= 10
          ? `평점 ★ ${(entity.score / 10).toFixed(1)}`
          : `매칭 ${entity.score}%`
        : "평점 정보가 아직 없어요";
    return {
      id: "review",
      titleKo: "리뷰",
      linesKo: [
        scoreLine,
        entity.subtitleKo?.trim() || "Context 기반 후보예요",
        "상세 리뷰는 외부 소스와 연결될 수 있어요",
      ],
      tagsKo:
        entity.score != null && entity.score >= 40
          ? ["추천", "적합"]
          : ["후보"],
    };
  }

  if (facetId === "why") {
    const why =
      input.whyLinesKo?.filter((l) => {
        const t = l.trim();
        if (!t) return false;
        // Drop duplicate price·rating fact cards from Decision Trace
        if (/★\s*[\d.]+/.test(t) && /(원|₩|¥|\$)/.test(t)) return false;
        return true;
      }).slice(0, 4) ?? [];
    const lines =
      why.length > 0
        ? why
        : [
            entity.subtitleKo?.trim() &&
            !(/★\s*[\d.]+/.test(entity.subtitleKo) && /(원|₩)/.test(entity.subtitleKo))
              ? entity.subtitleKo.trim()
              : `${entity.title}을(를) Context에 맞췄어요`,
            "일정·동선 기준으로 골랐어요",
            "Commit 전 Prepare만 · 결제는 승인 후",
          ];
    return {
      id: "why",
      titleKo: "왜 추천",
      linesKo: lines,
      tagsKo: ["AI Decision", "Context"],
    };
  }

  // nearby
  const nearby = relations.filter(
    (r) => r.fromId === entity.id || r.toId === entity.id,
  );
  const lines =
    nearby.length === 0
      ? ["주변에 연결된 관계가 아직 없어요", "「근처 맛집」으로 찾아볼 수 있어요"]
      : nearby.slice(0, 6).map((r) => {
          const walk =
            r.walkMinutes != null
              ? `도보 ${r.walkMinutes}분`
              : r.meters != null
                ? `${r.meters}m`
                : "";
          return walk ? `${r.labelKo} · ${walk}` : r.labelKo;
        });

  return {
    id: "nearby",
    titleKo: "주변",
    linesKo: lines,
    tagsKo: nearby.length > 0 ? [`${nearby.length}곳`] : ["탐색"],
  };
}
