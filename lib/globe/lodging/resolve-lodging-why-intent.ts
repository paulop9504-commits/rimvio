/**
 * Stay-type → why-intent SSOT (rules-first).
 * Every catalog stay type has a default primary/secondary why;
 * explicit utterance cues override when present.
 */

import {
  LODGING_STAY_TYPE_CATALOG,
  LODGING_STAY_TYPES,
  parseLodgingStayTypeFromText,
  type LodgingStayType,
} from "@/lib/globe/lodging/lodging-stay-types";
import type { TravelLodgingPriority } from "@/lib/situation-projection/travel-brain-personalization";
import type { EntityReviewCategoryId } from "@/lib/globe/feed-entity/types";

/** Why the user cares about this stay type / query. */
export type LodgingWhyIntent =
  | "value"
  | "price"
  | "clean"
  | "experience"
  | "location"
  | "quiet"
  | "convenience"
  | "family"
  | "space";

export type LodgingStayWhyDefault = {
  readonly primary: LodgingWhyIntent;
  readonly secondary: readonly LodgingWhyIntent[];
  /** One-line why for matchReasons / opportunity framing. */
  readonly reasonKo: string;
  /** Optional feed tip lines (not UI chrome). */
  readonly highlightTipsKo?: readonly string[];
};

export type LodgingWhyIntentResolution = {
  readonly stayType: LodgingStayType | null;
  readonly primary: LodgingWhyIntent;
  readonly secondary: readonly LodgingWhyIntent[];
  readonly reasonKo: string;
  readonly lodgingPriority: TravelLodgingPriority;
  readonly reviewFocusOrder: readonly EntityReviewCategoryId[];
  readonly highlightTipsKo: readonly string[];
};

const DEFAULT_HOTEL_REVIEW: readonly EntityReviewCategoryId[] = [
  "cleanliness",
  "staff",
  "value",
  "noise",
  "comfort",
];

/**
 * Full stay-type → why pre-seed. Keys must cover every `LodgingStayType`.
 * Keep specific nouns first in product copy — not generic 「숙소」.
 */
export const LODGING_STAY_WHY_DEFAULTS: Readonly<
  Record<LodgingStayType, LodgingStayWhyDefault>
> = {
  // ── Hotel ────────────────────────────────────────────────────
  capsule: {
    primary: "value",
    secondary: ["price", "clean", "location", "convenience"],
    reasonKo: "캡슐은 보통 가성비·짧은 숙박 의도예요",
    highlightTipsKo: ["가격대", "청결", "역까지 도보"],
  },
  airport_hotel: {
    primary: "convenience",
    secondary: ["location", "quiet", "clean"],
    reasonKo: "공항 호텔은 환승·새벽 비행 동선이 핵심이에요",
    highlightTipsKo: ["터미널 거리", "셔틀", "24시 체크인"],
  },
  residence_hotel: {
    primary: "space",
    secondary: ["convenience", "value", "clean", "family"],
    reasonKo: "레지던스는 장기·취사·공간 의도가 커요",
    highlightTipsKo: ["키친", "세탁", "면적"],
  },
  luxury_hotel: {
    primary: "experience",
    secondary: ["clean", "quiet", "convenience"],
    reasonKo: "럭셔리는 서비스·경험·청결을 더 봐요",
    highlightTipsKo: ["서비스", "청결", "뷰"],
  },
  boutique_hotel: {
    primary: "experience",
    secondary: ["clean", "location", "value"],
    reasonKo: "부티크는 개성·분위기 경험이 우선이에요",
    highlightTipsKo: ["디자인", "위치", "후기 분위기"],
  },
  business_hotel: {
    primary: "convenience",
    secondary: ["location", "quiet", "clean", "value"],
    reasonKo: "비즈니스는 역·업무 동선·숙면이 우선이에요",
    highlightTipsKo: ["역세권", "책상·와이파이", "소음"],
  },
  resort: {
    primary: "experience",
    secondary: ["quiet", "family", "clean", "space"],
    reasonKo: "리조트는 휴양·시설 경험 의도가 커요",
    highlightTipsKo: ["풀·부대시설", "가족", "전망"],
  },
  hotel: {
    primary: "location",
    secondary: ["value", "clean", "convenience"],
    reasonKo: "일반 호텔은 위치·가성비·청결을 같이 봐요",
    highlightTipsKo: ["위치", "가격", "청결"],
  },

  // ── Traditional ──────────────────────────────────────────────
  temple_stay: {
    primary: "experience",
    secondary: ["quiet", "clean"],
    reasonKo: "템플스테이는 고요한 체험 의도가 커요",
    highlightTipsKo: ["프로그램", "조용함", "규칙"],
  },
  machiya: {
    primary: "experience",
    secondary: ["space", "location", "clean"],
    reasonKo: "마치야는 전통 공간 경험이 핵심이에요",
    highlightTipsKo: ["공간", "위치", "청결"],
  },
  hanok: {
    primary: "experience",
    secondary: ["quiet", "clean", "family"],
    reasonKo: "한옥은 전통 분위기·경험 의도가 커요",
    highlightTipsKo: ["마당·온돌", "청결", "위치"],
  },
  ryokan: {
    primary: "experience",
    secondary: ["clean", "quiet", "family"],
    reasonKo: "료칸은 온천·식사·분위기 경험이 핵심이에요",
    highlightTipsKo: ["온천", "식사", "청결"],
  },

  // ── Vacation rental ──────────────────────────────────────────
  pool_villa: {
    primary: "experience",
    secondary: ["space", "family", "quiet"],
    reasonKo: "풀빌라는 프라이빗 경험·공간이 우선이에요",
    highlightTipsKo: ["풀", "인원", "프라이빗"],
  },
  villa: {
    primary: "space",
    secondary: ["family", "experience", "quiet"],
    reasonKo: "빌라는 공간·단체·프라이빗 의도가 커요",
    highlightTipsKo: ["인원", "키친", "주차"],
  },
  airbnb: {
    primary: "value",
    secondary: ["space", "location", "clean", "family"],
    reasonKo: "에어비앤비는 가성비·생활형 공간이 강해요",
    highlightTipsKo: ["후기 청결", "위치", "호스트"],
  },
  condo: {
    primary: "space",
    secondary: ["value", "family", "location", "clean"],
    reasonKo: "콘도는 취사·장기·공간 의도가 커요",
    highlightTipsKo: ["키친", "세탁", "면적"],
  },
  apartment: {
    primary: "space",
    secondary: ["value", "location", "clean", "family"],
    reasonKo: "아파트형은 생활·취사·가성비 의도가 커요",
    highlightTipsKo: ["키친", "위치", "청결"],
  },
  pension: {
    primary: "family",
    secondary: ["space", "experience", "quiet", "value"],
    reasonKo: "펜션은 가족·단체·공간 의도가 커요",
    highlightTipsKo: ["인원", "바베큐", "주차"],
  },

  // ── Nature ───────────────────────────────────────────────────
  glamping: {
    primary: "experience",
    secondary: ["family", "quiet", "convenience"],
    reasonKo: "글램핑은 감성 캠핑 경험이 핵심이에요",
    highlightTipsKo: ["시설 편의", "뷰", "날씨"],
  },
  caravan: {
    primary: "experience",
    secondary: ["space", "family", "convenience"],
    reasonKo: "카라반은 이동·이색 경험 의도가 커요",
    highlightTipsKo: ["주차", "설비", "인원"],
  },
  campsite: {
    primary: "experience",
    secondary: ["value", "family", "quiet"],
    reasonKo: "캠핑은 야외 경험·가성비 의도가 커요",
    highlightTipsKo: ["사이트", "샤워", "매점"],
  },
  cabin: {
    primary: "quiet",
    secondary: ["experience", "space", "family"],
    reasonKo: "캐빈은 조용한 자연 휴식이 우선이에요",
    highlightTipsKo: ["한적함", "난방", "위치"],
  },
  lodge: {
    primary: "experience",
    secondary: ["quiet", "location", "family"],
    reasonKo: "롯지는 자연·액티비티 경험이 커요",
    highlightTipsKo: ["주변 액티비티", "식사", "조용함"],
  },

  // ── Local stay ───────────────────────────────────────────────
  farmstay: {
    primary: "experience",
    secondary: ["family", "quiet", "value"],
    reasonKo: "팜스테이는 농촌 체험·가족 의도가 커요",
    highlightTipsKo: ["체험", "식사", "아이"],
  },
  homestay: {
    primary: "experience",
    secondary: ["value", "clean", "location"],
    reasonKo: "홈스테이는 현지 생활 경험이 핵심이에요",
    highlightTipsKo: ["호스트", "위치", "청결"],
  },
  bnb: {
    primary: "experience",
    secondary: ["clean", "location", "value"],
    reasonKo: "B&B는 조식·소규모 경험 의도가 커요",
    highlightTipsKo: ["조식", "호스트", "청결"],
  },

  // ── Budget ───────────────────────────────────────────────────
  dormitory: {
    primary: "price",
    secondary: ["value", "location", "clean"],
    reasonKo: "도미토리는 최저가·백패커 의도가 강해요",
    highlightTipsKo: ["가격", "락커", "위치"],
  },
  guesthouse: {
    primary: "value",
    secondary: ["price", "location", "experience", "clean"],
    reasonKo: "게스트하우스는 가성비·로컬 감성이 커요",
    highlightTipsKo: ["가격", "공용공간", "위치"],
  },
  hostel: {
    primary: "value",
    secondary: ["price", "location", "experience", "clean"],
    reasonKo: "호스텔은 가성비·사교·위치 신호가 강해요",
    highlightTipsKo: ["가격", "위치", "공용 라운지"],
  },
  motel: {
    primary: "convenience",
    secondary: ["price", "location", "clean"],
    reasonKo: "모텔은 자동차·단기·편의 의도가 커요",
    highlightTipsKo: ["주차", "가격", "청결"],
  },
};

/** Generic lodging when no stay type matched. */
export const LODGING_WHY_FALLBACK: LodgingStayWhyDefault = {
  primary: "location",
  secondary: ["value", "clean", "convenience"],
  reasonKo: "숙소 검색은 위치·가성비·청결을 함께 봐요",
  highlightTipsKo: ["위치", "가격", "청결"],
};

function uniqueWhy(
  primary: LodgingWhyIntent,
  rest: readonly LodgingWhyIntent[],
): LodgingWhyIntent[] {
  const out: LodgingWhyIntent[] = [primary];
  for (const item of rest) {
    if (!out.includes(item)) {
      out.push(item);
    }
  }
  return out;
}

function reorderReviewFocus(
  preferred: readonly EntityReviewCategoryId[],
): EntityReviewCategoryId[] {
  const seen = new Set<EntityReviewCategoryId>();
  const out: EntityReviewCategoryId[] = [];
  for (const id of preferred) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  for (const id of DEFAULT_HOTEL_REVIEW) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Broad utterance → why. More specific phrases win by order.
 */
export function parseLodgingWhyFromUtterance(
  text: string,
): LodgingWhyIntent | null {
  const t = text.trim();
  if (!t) {
    return null;
  }

  if (
    /가족|아이|어린이|키즈|패밀리|유아|baby|kids|family|부모님|엄마|아빠/iu.test(
      t,
    )
  ) {
    return "family";
  }
  if (
    /취사|키친|주방|세탁|장기|한달|한\s*달|거실|넓은|공간|면적|kitchen|washer|long\s*stay/iu.test(
      t,
    )
  ) {
    return "space";
  }
  if (/가성비|값\s*대비|가성|합리|가격\s*대비/iu.test(t)) {
    return "value";
  }
  if (
    /저렴|싸게|싼|저가|최저|할인|budget|cheap|저예산|아끼/iu.test(t)
  ) {
    return "price";
  }
  if (/깨끗|청결|위생|쾌적|소독|청소|clean|hygien/iu.test(t)) {
    return "clean";
  }
  if (
    /신기|독특|경험|체험|인생샷|인스타|감성|분위기|뷰|온천|풀장|이색|힐링|romantic|instagram/iu.test(
      t,
    )
  ) {
    return "experience";
  }
  if (/조용|숙면|소음|방음|한적|quiet|sleep/iu.test(t)) {
    return "quiet";
  }
  if (
    /출장|미팅|비즈니스|업무|와이파이|wifi|책상|셔틀|체크인|환승|새벽\s*비행|터미널/iu.test(
      t,
    )
  ) {
    return "convenience";
  }
  if (
    /역세|가까운|도보\s*\d|도보\s*분|교통\s*편|위치\s*좋|시내\s*중심|station\s*near|near\s*station|walk\s*min/iu.test(
      t,
    ) ||
    /(?:가까운|근처|옆)\s*(?:역|공항|터미널)/iu.test(t)
  ) {
    return "location";
  }
  return null;
}

export function defaultWhyForStayType(
  stayType: LodgingStayType | null,
): LodgingStayWhyDefault {
  if (!stayType) {
    return LODGING_WHY_FALLBACK;
  }
  return LODGING_STAY_WHY_DEFAULTS[stayType] ?? LODGING_WHY_FALLBACK;
}

export function priorityFromWhy(why: LodgingWhyIntent): TravelLodgingPriority {
  switch (why) {
    case "value":
    case "price":
      return "price";
    case "experience":
      return "aesthetic";
    case "quiet":
    case "clean":
      return "quiet";
    case "family":
    case "space":
      return "family";
    case "convenience":
    case "location":
      return "station";
    default:
      return "station";
  }
}

export function reviewOrderForWhy(
  why: LodgingWhyIntent,
): readonly EntityReviewCategoryId[] {
  switch (why) {
    case "value":
      return ["value", "cleanliness", "comfort", "staff", "noise"];
    case "price":
      return ["value", "cleanliness", "noise", "staff", "comfort"];
    case "clean":
      return ["cleanliness", "comfort", "noise", "staff", "value"];
    case "experience":
      return ["comfort", "staff", "cleanliness", "value", "noise"];
    case "quiet":
      return ["noise", "cleanliness", "comfort", "staff", "value"];
    case "family":
      return ["comfort", "cleanliness", "staff", "value", "noise"];
    case "space":
      return ["comfort", "value", "cleanliness", "staff", "noise"];
    case "location":
    case "convenience":
      return ["value", "staff", "cleanliness", "comfort", "noise"];
    default:
      return DEFAULT_HOTEL_REVIEW;
  }
}

function stayLabelKo(stayType: LodgingStayType | null): string {
  if (!stayType) {
    return "숙소";
  }
  return (
    LODGING_STAY_TYPE_CATALOG.find((row) => row.id === stayType)?.labelKo ??
    "이 숙소 유형"
  );
}

function whyReasonKo(
  why: LodgingWhyIntent,
  stayType: LodgingStayType | null,
): string {
  const stay = stayLabelKo(stayType);
  switch (why) {
    case "value":
      return `${stay} · 가성비 의도로 맞춰 볼게요`;
    case "price":
      return `${stay} · 가격을 더 볼게요`;
    case "clean":
      return `${stay} · 청결을 더 볼게요`;
    case "experience":
      return `${stay} · 경험·분위기를 더 볼게요`;
    case "quiet":
      return `${stay} · 조용함을 더 볼게요`;
    case "location":
      return `${stay} · 위치·동선을 더 볼게요`;
    case "convenience":
      return `${stay} · 출장·교통 편의를 더 볼게요`;
    case "family":
      return `${stay} · 가족·인원 맞춤으로 볼게요`;
    case "space":
      return `${stay} · 공간·취사·장기를 더 볼게요`;
    default:
      return defaultWhyForStayType(stayType).reasonKo;
  }
}

/**
 * Resolve stay-type + utterance into why-intent for rank / highlight.
 * Explicit utterance why wins; stay-type noun alone does not override SSOT.
 */
export function resolveLodgingWhyIntent(input: {
  readonly utterance?: string | null;
  readonly stayType?: LodgingStayType | null;
}): LodgingWhyIntentResolution {
  const utterance = input.utterance?.trim() ?? "";
  const stayType =
    input.stayType ??
    (utterance ? parseLodgingStayTypeFromText(utterance) : null);

  const whyProbe = stripStayTypeSurface(utterance, stayType);
  const fromText = whyProbe ? parseLodgingWhyFromUtterance(whyProbe) : null;
  const defaults = defaultWhyForStayType(stayType);
  const primary = fromText ?? defaults.primary;
  const secondary = uniqueWhy(
    primary,
    fromText
      ? [defaults.primary, ...defaults.secondary]
      : defaults.secondary,
  ).slice(1);

  return {
    stayType,
    primary,
    secondary,
    reasonKo: fromText ? whyReasonKo(fromText, stayType) : defaults.reasonKo,
    lodgingPriority: priorityFromWhy(primary),
    reviewFocusOrder: reorderReviewFocus(reviewOrderForWhy(primary)),
    highlightTipsKo: defaults.highlightTipsKo ?? [],
  };
}

/** Drop stay-type label/cues so 「공항 호텔」 does not become why=location. */
function stripStayTypeSurface(
  text: string,
  stayType: LodgingStayType | null,
): string {
  if (!text.trim() || !stayType) {
    return text.trim();
  }
  const entry = LODGING_STAY_TYPE_CATALOG.find((row) => row.id === stayType);
  if (!entry) {
    return text.trim();
  }
  let next = text.replace(entry.cues, " ");
  const label = entry.labelKo.trim();
  if (label) {
    next = next.replace(
      new RegExp(label.replace(/\s+/gu, String.raw`\s*`), "iu"),
      " ",
    );
  }
  return next.replace(/\s+/gu, " ").trim();
}

/** Dev/CI — every catalog stay type must have a why default. */
export function assertLodgingStayWhyCoverage(): void {
  for (const id of LODGING_STAY_TYPES) {
    if (!LODGING_STAY_WHY_DEFAULTS[id]) {
      throw new Error(`missing LODGING_STAY_WHY_DEFAULTS for ${id}`);
    }
  }
}
