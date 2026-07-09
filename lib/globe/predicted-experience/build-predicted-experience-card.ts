import { copy } from "@/lib/copy/human-ko";
import type { LodgingStayWindow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { LodgingDynamicTags } from "@/lib/globe/lodging/lodging-dynamic-tag-types";
import type { LodgingEateryRelationSummary } from "@/lib/globe/relation/describe-lodging-eatery-relation";

export type PredictedExperienceSignalBadge = {
  id: string;
  labelKo: string;
};

export type PredictedExperienceProvenance = {
  id: string;
  labelKo: string;
  detailKo: string;
};

export type PredictedExperienceCardModel = {
  summaryKo: string;
  supportBulletsKo: readonly string[];
  narrativeKo: string;
  confidenceLabelKo: string;
  signalBadges: readonly PredictedExperienceSignalBadge[];
  provenance: readonly PredictedExperienceProvenance[];
};

type LodgingPredictedExperienceInput = {
  title: string;
  situationalLabel?: string | null;
  stayWindowLabel?: string | null;
  stayWindow?: LodgingStayWindow | null;
  dynamicTags?: LodgingDynamicTags | null;
  recommendReason?: string | null;
  recommendReasons?: readonly string[];
  weatherPrepLine?: string | null;
  tempC?: number | null;
  priceKrw?: number | null;
  partnerLabel?: string | null;
  /** When true, priceKrw is the stay total (LiteAPI live rates), not per-night. */
  priceIsStayTotal?: boolean;
};

type EateryPredictedExperienceInput = {
  name: string;
  recommendReason?: string | null;
  recommendReasons?: readonly string[];
  relationSummary?: LodgingEateryRelationSummary | null;
  cuisineHint?: string | null;
  rating?: number | null;
  openNow?: boolean | null;
  priceLevel?: number | null;
  providerLabel?: string | null;
  categoryLabel?: string | null;
  weatherPrepLine?: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function uniqueLines(lines: readonly (string | null | undefined)[], max: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of lines) {
    const line = normalizeText(raw);
    if (!line || seen.has(line)) {
      continue;
    }
    seen.add(line);
    output.push(line);
    if (output.length >= max) {
      break;
    }
  }
  return output;
}

function formatKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPriceLevel(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  if (value <= 1) {
    return "부담이 가벼운 편";
  }
  if (value === 2) {
    return "가볍게 들르기 좋은 편";
  }
  if (value === 3) {
    return "조금 여유를 두는 편";
  }
  return "기념일처럼 보는 편";
}

function confidenceLabelForCount(count: number): string {
  if (count >= 4) {
    return copy.globe.predictedExperienceConfidenceHigh;
  }
  if (count >= 2) {
    return copy.globe.predictedExperienceConfidenceMedium;
  }
  return copy.globe.predictedExperienceConfidenceLow;
}

function buildLodgingSummary(input: LodgingPredictedExperienceInput): string {
  const contextLine = normalizeText(input.dynamicTags?.contextLine);
  if (contextLine) {
    return `이 조건이면 ${input.title}에서 쉬고 다시 움직이는 흐름이 자연스러울 가능성이 커요.`;
  }
  if (normalizeText(input.stayWindowLabel)) {
    return `이 일정이면 ${input.title}가 머무는 리듬을 무리 없이 받쳐 줄 가능성이 커요.`;
  }
  if ((input.tempC ?? 0) >= 30) {
    return `이 조건이면 ${input.title}가 더위를 식히고 쉬어 가는 거점처럼 느껴질 가능성이 커요.`;
  }
  if (normalizeText(input.situationalLabel)) {
    return `이 조건이면 ${input.title}가 지금 맥락을 안정적으로 받쳐 줄 가능성이 있어요.`;
  }
  return `이 조건이면 ${input.title}가 지금 동선을 매끈하게 이어 줄 가능성이 있어요.`;
}

function buildLodgingNarrative(input: LodgingPredictedExperienceInput): string {
  const parts = uniqueLines(
    [
      input.recommendReason
        ? `${input.recommendReason} 그래서 이 숙소가 지금 맥락에 맞을 가능성이 커요.`
        : null,
      input.stayWindowLabel
        ? `${input.stayWindowLabel} 기준으로 움직이면 체크인과 이동 리듬을 맞추기 쉬워 보여요.`
        : null,
      input.weatherPrepLine
        ? `${input.weatherPrepLine}라서 쉬는 타이밍과 이동 부담을 같이 보는 편이 좋아요.`
        : normalizeText(input.dynamicTags?.contextLine)
          ? `${normalizeText(input.dynamicTags?.contextLine)} 그래서 짧게 쉬고 다시 나가기 좋은 흐름이 예상돼요.`
          : null,
    ],
    3,
  );
  return (
    parts.join(" ") ||
    "지금은 강한 근거가 많지 않아서, 머무는 시간과 이동 흐름을 가볍게 겹쳐 본 추정이에요."
  );
}

function buildLodgingProvenance(
  input: LodgingPredictedExperienceInput,
): PredictedExperienceProvenance[] {
  return uniqueLines(
    [
      input.recommendReason ? `추천 근거|${input.recommendReason}` : null,
      input.stayWindowLabel ? `머무는 시간|${input.stayWindowLabel}` : null,
      input.weatherPrepLine ? `날씨|${input.weatherPrepLine}` : null,
      input.dynamicTags?.chips.length
        ? `이동 신호|${input.dynamicTags.chips
            .slice(0, 2)
            .map((chip) => chip.label)
            .join(" · ")}`
        : null,
      input.priceKrw != null
        ? input.priceIsStayTotal
          ? `가격|${formatKrw(input.priceKrw)}`
          : `가격대|1박 ${formatKrw(input.priceKrw)}`
        : null,
      input.partnerLabel ? `공급자|${input.partnerLabel}` : null,
      input.stayWindow?.confidence === "estimated" ? "시간 신뢰도|머무는 시간은 추정값이에요" : null,
    ],
    6,
  ).map((line, index) => {
    const [labelKo, detailKo] = line.split("|");
    return {
      id: `lodging:${index}:${labelKo}`,
      labelKo: labelKo ?? "근거",
      detailKo: detailKo ?? "",
    };
  });
}

function buildLodgingSignalBadges(
  input: LodgingPredictedExperienceInput,
): PredictedExperienceSignalBadge[] {
  return uniqueLines(
    [
      normalizeText(input.situationalLabel),
      input.weatherPrepLine ? "날씨 반영" : null,
      input.dynamicTags?.chips[0]?.label,
      input.stayWindow?.confidence === "estimated" ? "시간 추정" : null,
    ],
    4,
  ).map((labelKo, index) => ({
    id: `lodging-signal:${index}:${labelKo}`,
    labelKo,
  }));
}

export function buildLodgingPredictedExperienceCard(
  input: LodgingPredictedExperienceInput,
): PredictedExperienceCardModel {
  const supportBulletsKo = uniqueLines(
    [
      input.recommendReason,
      ...(input.recommendReasons ?? []),
      input.stayWindowLabel ? `머무는 흐름: ${input.stayWindowLabel}` : null,
      input.weatherPrepLine ? `날씨 신호: ${input.weatherPrepLine}` : null,
      normalizeText(input.dynamicTags?.contextLine),
    ],
    3,
  );
  const provenance = buildLodgingProvenance(input);
  return {
    summaryKo: buildLodgingSummary(input),
    supportBulletsKo,
    narrativeKo: buildLodgingNarrative(input),
    confidenceLabelKo: confidenceLabelForCount(provenance.length),
    signalBadges: buildLodgingSignalBadges(input),
    provenance,
  };
}

function buildEaterySummary(input: EateryPredictedExperienceInput): string {
  if (input.relationSummary) {
    return `이 조건이면 ${input.relationSummary.anchorName}에서 이어 들르기 자연스러운 한 끼일 가능성이 커요.`;
  }
  if ((input.rating ?? 0) >= 4.4 && input.openNow === true) {
    return `이 조건이면 지금 바로 가도 만족도가 높을 가능성이 커요.`;
  }
  if (normalizeText(input.cuisineHint)) {
    return `이 조건이면 ${normalizeText(input.cuisineHint)} 흐름을 채워 주는 한 끼가 될 가능성이 커요.`;
  }
  return `이 조건이면 ${input.name}가 지금 맥락에 잘 붙는 한 끼일 가능성이 있어요.`;
}

function buildEateryNarrative(input: EateryPredictedExperienceInput): string {
  const parts = uniqueLines(
    [
      input.recommendReason
        ? `${input.recommendReason} 그래서 이 한 끼가 지금 흐름에 잘 붙을 가능성이 커요.`
        : null,
      input.relationSummary
        ? `${input.relationSummary.summaryKo} 그래서 이동 부담 없이 이어 들르기 쉬워 보여요.`
        : null,
      input.weatherPrepLine
        ? `${input.weatherPrepLine}라서 실내에 머무는 시간이나 들르는 타이밍을 같이 보는 편이 좋아요.`
        : null,
      input.openNow === true
        ? "지금 열려 있다면 즉시성까지 맞아서 계획을 덜 흔들 가능성이 커요."
        : input.openNow === false
          ? "지금은 시간이 어긋날 수 있어서 바로 방문보다는 다음 타이밍을 보는 편이 좋아요."
          : null,
    ],
    4,
  );
  return (
    parts.join(" ") ||
    "지금은 강한 근거가 많지 않아서, 동선과 기본 메타를 가볍게 겹쳐 본 추정이에요."
  );
}

function buildEateryProvenance(
  input: EateryPredictedExperienceInput,
): PredictedExperienceProvenance[] {
  return uniqueLines(
    [
      input.recommendReason ? `추천 근거|${input.recommendReason}` : null,
      input.relationSummary ? `숙소 동선|${input.relationSummary.summaryKo}` : null,
      input.rating != null ? `평점|${input.rating.toFixed(1)}` : null,
      input.openNow == null ? null : `영업 상태|${input.openNow ? "지금 영업 중이에요" : "지금은 영업 종료로 보여요"}`,
      input.priceLevel != null ? `가격 톤|${formatPriceLevel(input.priceLevel)}` : null,
      input.providerLabel ? `출처|${input.providerLabel}` : null,
      input.cuisineHint ? `음식 힌트|${input.cuisineHint}` : null,
      input.weatherPrepLine ? `날씨|${input.weatherPrepLine}` : null,
    ],
    6,
  ).map((line, index) => {
    const [labelKo, detailKo] = line.split("|");
    return {
      id: `eatery:${index}:${labelKo}`,
      labelKo: labelKo ?? "근거",
      detailKo: detailKo ?? "",
    };
  });
}

function buildEaterySignalBadges(
  input: EateryPredictedExperienceInput,
): PredictedExperienceSignalBadge[] {
  return uniqueLines(
    [
      input.relationSummary?.badgeLabelKo,
      input.openNow === true ? "영업 중" : input.openNow === false ? "시간 확인" : null,
      input.cuisineHint,
      input.rating != null && input.rating >= 4.4 ? "평점 강함" : null,
    ],
    4,
  ).map((labelKo, index) => ({
    id: `eatery-signal:${index}:${labelKo}`,
    labelKo,
  }));
}

export function buildEateryPredictedExperienceCard(
  input: EateryPredictedExperienceInput,
): PredictedExperienceCardModel {
  const supportBulletsKo = uniqueLines(
    [
      input.recommendReason,
      ...(input.recommendReasons ?? []),
      input.rating != null ? `평점 ${input.rating.toFixed(1)}` : null,
      input.openNow == null ? null : input.openNow ? "지금 영업 중" : "지금은 영업 종료로 보여요",
      input.priceLevel != null ? `가격 톤: ${formatPriceLevel(input.priceLevel)}` : null,
      input.relationSummary?.summaryKo,
    ],
    3,
  );
  const provenance = buildEateryProvenance(input);
  return {
    summaryKo: buildEaterySummary(input),
    supportBulletsKo,
    narrativeKo: buildEateryNarrative(input),
    confidenceLabelKo: confidenceLabelForCount(provenance.length),
    signalBadges: buildEaterySignalBadges(input),
    provenance,
  };
}
