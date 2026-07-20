import type { ProjectionProjectKind } from "@/lib/projection-engine/types";

export type InferredProjectionGoal = {
  readonly kind: ProjectionProjectKind;
  readonly summaryKo: string;
  readonly titleKo: string;
  readonly confidence: number;
  readonly placeHint: string | null;
};

const PLACE_RE =
  /(?:유성|둔산|관저|세종|대전|서울|부산|제주|오사카|도쿄|교토|후쿠오카|상하이|베이징|홍콩|방콕|타이베이|[가-힣]{2,8}(?:시|구|동|읍|면)?)/u;

/**
 * Step 1 — infer real goal (not keyword dump).
 * Deterministic cold-start; LLM may refine later via system prompt.
 */
export function inferProjectionGoal(utterance: string): InferredProjectionGoal {
  const text = utterance.trim();
  const placeHint = PLACE_RE.exec(text)?.[0]?.trim() ?? null;

  if (
    /배고프|출출|국밥|국물|맛집|밥\s*먹|식사|배고파|배고픈|점심|저녁|아침|카페|라멘|초밥|스시/iu.test(
      text,
    )
  ) {
    const where = placeHint ? `${placeHint} ` : "";
    return {
      kind: "eat",
      summaryKo: "먹을 곳을 찾는다",
      titleKo: placeHint
        ? `${placeHint} 맛집`
        : /국밥|국물/u.test(text)
          ? "뜨끈한 국물 맛집"
          : "맛집 찾기",
      confidence: 0.86,
      placeHint,
    };
  }

  if (
    /여행|출장|trip|travel|honeymoon|신혼|휴가|관광|3박|2박|며칠|going\s+to|next\s+month|방문\s*할|갈래|가려고/iu.test(
      text,
    ) ||
    (placeHint != null &&
      /(?:month|week|박|일\s*정|일정|가\s*려|갈\s*거)/iu.test(text))
  ) {
    return {
      kind: "travel",
      summaryKo: "여행 프로젝트를 만든다",
      titleKo: placeHint ? `${placeHint} 여행` : "여행",
      confidence: 0.9,
      placeHint,
    };
  }

  if (/노트북|랩탑|laptop|사야|구매|장만|사고\s*싶/iu.test(text)) {
    return {
      kind: "purchase",
      summaryKo: "구매 계획을 세운다",
      titleKo: /노트북|랩탑|laptop/iu.test(text)
        ? "노트북 구매"
        : "구매 계획",
      confidence: 0.84,
      placeHint,
    };
  }

  if (/데이트|연인|커플|남친|여친/iu.test(text)) {
    return {
      kind: "date",
      summaryKo: "데이트 장소를 준비한다",
      titleKo: placeHint ? `${placeHint} 데이트` : "주말 데이트",
      confidence: 0.82,
      placeHint,
    };
  }

  if (/취업|이직|면접|job\s*search|채용/iu.test(text)) {
    return {
      kind: "job",
      summaryKo: "구직 프로젝트를 만든다",
      titleKo: "구직",
      confidence: 0.8,
      placeHint,
    };
  }

  if (/이사|입주|전세|월세|moving/iu.test(text)) {
    return {
      kind: "move",
      summaryKo: "이사 프로젝트를 만든다",
      titleKo: placeHint ? `${placeHint} 이사` : "이사",
      confidence: 0.83,
      placeHint,
    };
  }

  return {
    kind: "generic",
    summaryKo: "요청을 프로젝트로 만든다",
    titleKo: placeHint ? `${placeHint} 맥락` : text.slice(0, 24) || "새 프로젝트",
    confidence: 0.55,
    placeHint,
  };
}
