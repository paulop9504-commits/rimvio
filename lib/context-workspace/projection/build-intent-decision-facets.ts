/**
 * Intent-adaptive Decision Engine projection for one selected Reality Object.
 *
 * Same facts · different Labels + Evidence lines as Intent / realityPlan change.
 * Not a search-result card wall — Diff / Trust / Explain-on-demand.
 *
 * @see docs/RIMVIO_CONSTITUTION_LAYER.md § Intent · Trust · Interface
 * @see docs/adr/048-cursor-agent-policy.md Dual surface
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import type { WorkspaceRealityPlan } from "@/lib/context-workspace/workspace-reality-patch";
import { resolveCompareCriteriaWeights } from "@/lib/context-workspace/projection/build-decision-projection";
import type { CompareDecisionCriteriaWeights } from "@/lib/context-workspace/projection/types";
import {
  getLodgingStayTypeEntry,
  parseLodgingStayTypeFromText,
  type LodgingStayType,
} from "@/lib/globe/lodging/lodging-stay-types";
import { resolveLodgingWhyIntent } from "@/lib/globe/lodging/resolve-lodging-why-intent";
import type {
  MobileWorkspaceEntity,
  MobileWorkspaceRelation,
} from "@/lib/mobile-workspace/types";
import type {
  ObjectFacetDetail,
  ObjectFacetId,
} from "@/lib/mobile-workspace/object-facets";
import { formatHotelPriceDisplayKo } from "@/lib/globe/context-hub/format-lodging-nightly-price";

export type IntentWeightBar = {
  readonly id: "distance" | "price" | "rating" | "preference";
  readonly labelKo: string;
  /** 0–100 display percent */
  readonly percent: number;
};

export type IntentDecisionFacet = {
  readonly id: ObjectFacetId;
  /** Chip label — changes with Intent */
  readonly labelKo: string;
  /** Section title inside panel */
  readonly titleKo: string;
  /** Evidence lines (facts / judgment — not essay) */
  readonly linesKo: readonly string[];
  readonly tagsKo: readonly string[];
};

export type IntentDecisionFacetProjection = {
  /** Top Intent bar copy */
  readonly intentLabelKo: string;
  readonly stayType: LodgingStayType | null;
  readonly primaryWhyKo: string;
  readonly weights: readonly IntentWeightBar[];
  readonly facets: readonly IntentDecisionFacet[];
  readonly matchHintPercent: number | null;
};

function intentBlob(input: {
  readonly intentText?: string | null;
  readonly realityPlan?: WorkspaceRealityPlan | null;
  readonly query?: string | null;
  readonly lastChangeKo?: string | null;
  readonly summaryKo?: string | null;
}): string {
  const stay =
    input.realityPlan?.stayType != null
      ? getLodgingStayTypeEntry(input.realityPlan.stayType)?.labelKo ??
        input.realityPlan.stayType
      : "";
  return [
    input.intentText,
    input.query,
    input.lastChangeKo,
    input.summaryKo,
    stay,
    input.realityPlan?.stationNear ? "역 근처" : "",
    input.realityPlan?.onsenRequired ? "온천" : "",
    input.realityPlan?.maxPriceBand != null &&
    input.realityPlan.maxPriceBand <= 2
      ? "가성비 저렴"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Build Intent bar label from plan + utterance cues.
 */
export function buildWorkspaceIntentLabelKo(input: {
  readonly intentText?: string | null;
  readonly realityPlan?: WorkspaceRealityPlan | null;
  readonly query?: string | null;
  readonly lastChangeKo?: string | null;
  readonly summaryKo?: string | null;
  /** Active entity kind — avoids 「숙소」 label on restaurant cards */
  readonly entityKind?: MobileWorkspaceEntity["kind"] | null;
}): string {
  const explicit = input.intentText?.trim();
  if (explicit && explicit.length >= 2 && explicit.length <= 48) {
    return explicit.startsWith("Intent:")
      ? explicit
      : `Intent: ${explicit}`;
  }

  const plan = input.realityPlan;
  const isRestaurant = input.entityKind === "restaurant";
  const stay = !isRestaurant
    ? plan?.stayType
      ? getLodgingStayTypeEntry(plan.stayType)?.labelKo ?? null
      : parseLodgingStayTypeFromText(intentBlob(input))
        ? getLodgingStayTypeEntry(
            parseLodgingStayTypeFromText(intentBlob(input))!,
          )?.labelKo
        : null
    : null;

  const bits: string[] = [];
  const area =
    input.summaryKo?.replace(/\s*여행.*$/u, "").trim() ||
    input.query
      ?.replace(/\s*(숙소|호텔|맛집|찾아.*)$/u, "")
      .trim() ||
    null;
  if (area && area.length <= 12) bits.push(area);
  if (plan?.stationNear) bits.push("역 근처");
  if (stay) bits.push(stay);
  else if (isRestaurant) bits.push("맛집");
  else if (input.entityKind === "hotel" || input.entityKind == null) {
    bits.push("숙소");
  }
  if (plan?.maxPriceBand != null && plan.maxPriceBand <= 2) {
    bits.push("가성비");
  }
  if (!isRestaurant && plan?.onsenRequired) bits.push("온천");

  const core = bits.join(" · ") || input.query?.trim() || "Workspace 탐색";
  return `Intent: ${core}`;
}

/**
 * Intent → criteria weights (extends trip defaults with realityPlan cues).
 */
export function resolveIntentCriteriaWeights(input: {
  readonly state?: Pick<
    ContextWorkspaceState,
    "realityDraft" | "summaryKo" | "query" | "domain" | "realityPlan"
  > | null;
  readonly intentText?: string | null;
  readonly realityPlan?: WorkspaceRealityPlan | null;
}): CompareDecisionCriteriaWeights {
  const plan = input.realityPlan ?? input.state?.realityPlan ?? null;
  const blob = intentBlob({
    intentText: input.intentText,
    realityPlan: plan,
    query: input.state?.query,
    summaryKo: input.state?.summaryKo,
  });

  const base = input.state
    ? resolveCompareCriteriaWeights(input.state)
    : { price: 0.25, location: 0.4, scheduleFit: 0.35 };

  let price = base.price;
  let location = base.location;
  let scheduleFit = base.scheduleFit;

  if (plan?.stationNear || /역\s*근처|역세권|가까운/iu.test(blob)) {
    location += 0.25;
    price -= 0.08;
  }
  if (
    (plan?.maxPriceBand != null && plan.maxPriceBand <= 2) ||
    /가성비|저렴|싸|budget|cheap/iu.test(blob)
  ) {
    price += 0.28;
    location -= 0.06;
  }
  if (plan?.stayType === "capsule" || /캡슐/iu.test(blob)) {
    price += 0.08;
    scheduleFit += 0.05;
  }
  if (plan?.onsenRequired || /온천/iu.test(blob)) {
    scheduleFit += 0.12;
  }
  if (/평점|리뷰|별점/iu.test(blob)) {
    scheduleFit += 0.1;
    price -= 0.05;
  }

  const sum = price + location + scheduleFit;
  if (sum <= 0) return base;
  return {
    price: price / sum,
    location: location / sum,
    scheduleFit: scheduleFit / sum,
  };
}

function weightsToBars(
  w: CompareDecisionCriteriaWeights,
): readonly IntentWeightBar[] {
  const distance = Math.round(w.location * 100);
  const price = Math.round(w.price * 100);
  const rating = Math.round(w.scheduleFit * 0.55 * 100);
  const preference = Math.max(0, 100 - distance - price - rating);
  return [
    { id: "distance", labelKo: "거리", percent: distance },
    { id: "price", labelKo: "가격", percent: price },
    { id: "rating", labelKo: "평점·적합", percent: rating },
    { id: "preference", labelKo: "선호", percent: preference },
  ];
}

function hotelPriceLine(entity: MobileWorkspaceEntity): string | null {
  const price = formatHotelPriceDisplayKo(entity.priceLabelKo);
  if (!price) return null;
  if (entity.kind === "hotel" && price.perNightSuffix) {
    return `${price.amountKo} / 1박`;
  }
  return price.amountKo;
}

function nearbyEvidence(
  entity: MobileWorkspaceEntity,
  relations: readonly MobileWorkspaceRelation[],
): readonly string[] {
  const nearby = relations.filter(
    (r) => r.fromId === entity.id || r.toId === entity.id,
  );
  if (nearby.length === 0) {
    return ["주변에 연결된 관계가 아직 없어요", "「근처 맛집」으로 확장할 수 있어요"];
  }
  return nearby.slice(0, 5).map((r) => {
    const walk =
      r.walkMinutes != null
        ? `도보 ${r.walkMinutes}분`
        : r.meters != null
          ? `${r.meters}m`
          : "";
    return walk ? `${r.labelKo} · ${walk}` : r.labelKo;
  });
}

/**
 * Project Labels + Evidence for ObjectPlacePanel from live Intent.
 */
export function buildIntentDecisionFacetProjection(input: {
  readonly entity: MobileWorkspaceEntity;
  readonly relations?: readonly MobileWorkspaceRelation[] | null;
  readonly intentText?: string | null;
  readonly realityPlan?: WorkspaceRealityPlan | null;
  readonly query?: string | null;
  readonly lastChangeKo?: string | null;
  readonly summaryKo?: string | null;
  readonly judgmentKo?: string | null;
  readonly whyLinesKo?: readonly string[] | null;
  readonly state?: Pick<
    ContextWorkspaceState,
    "realityDraft" | "summaryKo" | "query" | "domain" | "realityPlan"
  > | null;
  /** Previous shortlisted title for Alternative Diff */
  readonly previousCandidateTitleKo?: string | null;
}): IntentDecisionFacetProjection {
  const relations = input.relations ?? [];
  const plan = input.realityPlan ?? input.state?.realityPlan ?? null;
  const blob = intentBlob({
    intentText: input.intentText,
    realityPlan: plan,
    query: input.query ?? input.state?.query,
    lastChangeKo: input.lastChangeKo,
    summaryKo: input.summaryKo ?? input.state?.summaryKo,
  });

  const isRestaurant = input.entity.kind === "restaurant";
  const isHotel = input.entity.kind === "hotel";

  const stayType = isHotel
    ? (plan?.stayType ?? parseLodgingStayTypeFromText(blob) ?? null)
    : null;
  const whyIntent = isHotel
    ? resolveLodgingWhyIntent({
        stayType,
        utterance: blob,
      })
    : {
        stayType: null as LodgingStayType | null,
        primary: "location" as const,
        secondary: ["value", "convenience"] as const,
        reasonKo: isRestaurant
          ? "맛집 후보는 위치·평점·메뉴 적합을 함께 봐요"
          : "이 장소가 Context에 맞는 이유예요",
        lodgingPriority: "station" as const,
        reviewFocusOrder: [] as const,
        highlightTipsKo: isRestaurant
          ? (["가격대", "리뷰", "이동"] as const)
          : (["위치", "평점"] as const),
      };

  const intentLabelKo = buildWorkspaceIntentLabelKo({
    intentText: input.intentText,
    realityPlan: plan,
    query: input.query ?? input.state?.query,
    lastChangeKo: input.lastChangeKo,
    summaryKo: input.summaryKo ?? input.state?.summaryKo,
    entityKind: input.entity.kind,
  });

  const weightsRaw = resolveIntentCriteriaWeights({
    state: input.state,
    intentText: input.intentText,
    realityPlan: plan,
  });
  const weights = weightsToBars(weightsRaw);

  const nearStation =
    plan?.stationNear === true || /역\s*근처|역세권|가까운/iu.test(blob);
  const budget =
    (plan?.maxPriceBand != null && plan.maxPriceBand <= 2) ||
    /가성비|저렴|싸/iu.test(blob);
  const stayLabel = stayType
    ? getLodgingStayTypeEntry(stayType)?.labelKo ?? stayType
    : null;

  const priceLine = hotelPriceLine(input.entity);
  const star =
    input.entity.score != null && input.entity.score >= 10
      ? `★ ${(input.entity.score / 10).toFixed(1)}`
      : null;

  // —— Why facet (intent-first evidence) ——
  const whyLines: string[] = [];
  if (input.judgmentKo?.trim()) whyLines.push(input.judgmentKo.trim());
  for (const line of input.whyLinesKo ?? []) {
    const t = line.trim();
    if (t && !whyLines.includes(t)) whyLines.push(t);
  }
  if (nearStation) {
    whyLines.push("역·앵커까지 이동 부담을 Intent에 맞춤");
  }
  if (stayLabel) {
    whyLines.push(`${stayLabel} 선호 · ${whyIntent.reasonKo}`);
  } else if (whyIntent.reasonKo) {
    whyLines.push(whyIntent.reasonKo);
  }
  if (budget) whyLines.push("예산 비중 ↑ · 가성비 후보 우선");
  if (star) whyLines.push(`평점 ${star}`);
  for (const tip of whyIntent.highlightTipsKo.slice(0, 2)) {
    if (!whyLines.some((l) => l.includes(tip))) {
      whyLines.push(`확인 포인트 · ${tip}`);
    }
  }
  const whyEvidence = whyLines.filter(Boolean).slice(0, 5);

  // —— Price facet ——
  const priceTitle = budget
    ? "Optimized Dynamic Pricing"
    : stayType === "capsule"
      ? "캡슐 요금"
      : "가격";
  const priceLabel = budget ? "가성비" : "가격";
  const priceLines = [
    priceLine ? `현재가 · ${priceLine}` : "가격 정보가 아직 없어요",
    budget
      ? "Intent: 저렴·가성비 가중 · Prepare만 · Commit은 직접"
      : isRestaurant
        ? "Prepare만 · Commit은 직접"
        : "1박 기준 · Prepare로 예약 후보만 준비",
    plan?.maxPriceBand != null && isHotel
      ? `예산 밴드 ≤ ${plan.maxPriceBand}`
      : "Workspace Draft 기준",
  ];

  // —— Trace facet (review slot = Decision Trace weights) ——
  const traceTitle = "AI Decision Trace";
  const traceLabel = nearStation || budget || stayType ? "판단" : "리뷰";
  const traceLines = [
    ...weights.map((w) => `${w.labelKo} ${w.percent}%`),
    star ? `관측 ${star}` : "평점 표본 수집 중",
    input.entity.subtitleKo?.trim() &&
    !/★\s*[\d.]+/.test(input.entity.subtitleKo)
      ? input.entity.subtitleKo.trim()
      : "Evidence > Opinion · Trace는 투영일 뿐 Commit 아님",
  ];

  // —— Nearby / Spatial ——
  const nearbyTitle = nearStation
    ? "Spatial Surroundings"
    : stayType
      ? "주변 동선"
      : "주변";
  const nearbyLabel = nearStation ? "동선" : "주변";
  const nearbyLines = [...nearbyEvidence(input.entity, relations)];
  if (input.previousCandidateTitleKo?.trim()) {
    nearbyLines.push(
      `대안 Diff · 이전 후보「${input.previousCandidateTitleKo.trim()}」대비 재투영`,
    );
  }

  const facets: IntentDecisionFacet[] = [
    {
      id: "why",
      labelKo: "왜",
      titleKo: "왜 이 장소인지",
      linesKo:
        whyEvidence.length > 0
          ? whyEvidence
          : [`${input.entity.title} · Context에 맞춤`],
      tagsKo: ["Decision", stayLabel ?? "Context"].filter(Boolean) as string[],
    },
    {
      id: "price",
      labelKo: priceLabel,
      titleKo: priceTitle,
      linesKo: priceLines,
      tagsKo: budget ? ["가성비", "Draft"] : ["실시간", "Draft"],
    },
    {
      id: "review",
      labelKo: traceLabel,
      titleKo: traceTitle,
      linesKo: traceLines,
      tagsKo: ["Trace", "Weights"],
    },
    {
      id: "nearby",
      labelKo: nearbyLabel,
      titleKo: nearbyTitle,
      linesKo: nearbyLines.slice(0, 6),
      tagsKo: nearStation ? ["Station", "Spatial"] : ["Spatial"],
    },
  ];

  const topWeight = Math.max(...weights.map((w) => w.percent), 1);
  const matchHintPercent = Math.min(
    99,
    Math.round(55 + topWeight * 0.35 + (star ? 8 : 0) + (nearStation ? 5 : 0)),
  );

  return {
    intentLabelKo,
    stayType,
    primaryWhyKo: whyEvidence[0] ?? whyIntent.reasonKo,
    weights,
    facets,
    matchHintPercent,
  };
}

/** Map projection → ObjectFacetDetail for active tab. */
export function intentFacetToDetail(
  projection: IntentDecisionFacetProjection,
  facetId: ObjectFacetId,
): ObjectFacetDetail | null {
  const facet = projection.facets.find((f) => f.id === facetId);
  if (!facet) return null;
  return {
    id: facet.id,
    titleKo: facet.titleKo,
    linesKo: facet.linesKo,
    tagsKo: facet.tagsKo,
  };
}
