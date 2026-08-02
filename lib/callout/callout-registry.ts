/**
 * Object Type Registry — Callout Core never forks on hotel vs restaurant UI.
 * Add a type here; Callout modes compose from descriptors.
 */

import { filterCalloutModes } from "@/lib/callout/commit-boundary";
import type {
  CalloutObjectTypeDescriptor,
  RimvioObjectType,
} from "@/lib/callout/types";
import { CALLOUT_MODES } from "@/lib/callout/types";

const ALL_MODES = [...CALLOUT_MODES] as const;

const HOTEL: CalloutObjectTypeDescriptor = {
  type: "hotel",
  labelKo: "숙소",
  modes: ALL_MODES,
  intentAxes: [
    { id: "price", labelKo: "가격", nudge: "down" },
    { id: "location", labelKo: "위치", nudge: "up" },
    { id: "review", labelKo: "후기", nudge: "up" },
    { id: "view", labelKo: "뷰", nudge: "up" },
  ],
  exploreRelations: [
    { id: "breakfast", labelKo: "조식", matchKinds: ["eatery", "restaurant"] },
    { id: "restaurant", labelKo: "맛집", matchKinds: ["eatery", "restaurant"] },
    { id: "subway", labelKo: "이동", matchKinds: ["amenity", "route"] },
    { id: "poi", labelKo: "관광", matchKinds: ["poi"] },
    { id: "similar", labelKo: "비슷한 숙소", matchKinds: ["lodging", "hotel"] },
  ],
  prepareStepDefs: [
    {
      id: "dates",
      labelKo: "날짜 확인",
      isDone: (o) =>
        o.evidence.some((e) => e.source === "schedule" && e.present),
    },
    {
      id: "guests",
      labelKo: "인원 입력",
      isDone: () => false,
    },
    {
      id: "price",
      labelKo: "가격 확인",
      isDone: (o) => Boolean(o.facts.priceLabelKo),
    },
    {
      id: "compare",
      labelKo: "후보 비교",
      isDone: (o) => o.facts.inCompare || o.state === "shortlisted",
    },
  ],
  connectTargets: [
    { id: "flight", type: "flight", labelKo: "항공" },
    { id: "restaurant", type: "restaurant", labelKo: "맛집" },
    { id: "schedule", type: "schedule", labelKo: "일정" },
    { id: "budget", type: "budget", labelKo: "예산" },
  ],
  askPlaceholderKo: "예: 조식 좋은 곳으로 바꿔",
  prepareCtaKo: "예약 검토 생성",
  commitCtaKo: "Field에서 검토",
  simulateEmptyKo: "비교 후보가 있으면 변경 영향을 보여 줘요",
};

const RESTAURANT: CalloutObjectTypeDescriptor = {
  type: "restaurant",
  labelKo: "맛집",
  modes: ALL_MODES,
  intentAxes: [
    { id: "price", labelKo: "가격", nudge: "down" },
    { id: "location", labelKo: "위치", nudge: "up" },
    { id: "review", labelKo: "후기", nudge: "up" },
    { id: "atmosphere", labelKo: "분위기", nudge: "up" },
  ],
  exploreRelations: [
    { id: "hotel", labelKo: "숙소", matchKinds: ["lodging", "hotel"] },
    { id: "cafe", labelKo: "카페", matchKinds: ["eatery", "cafe"] },
    { id: "poi", labelKo: "주변", matchKinds: ["poi", "amenity"] },
    { id: "similar", labelKo: "비슷한 맛집", matchKinds: ["eatery", "restaurant"] },
  ],
  prepareStepDefs: [
    {
      id: "time",
      labelKo: "시간 확인",
      isDone: (o) =>
        o.evidence.some((e) => e.source === "schedule" && e.present),
    },
    {
      id: "party",
      labelKo: "인원 확인",
      isDone: () => false,
    },
    {
      id: "price",
      labelKo: "가격대 확인",
      isDone: (o) => Boolean(o.facts.priceLabelKo),
    },
    {
      id: "compare",
      labelKo: "후보 비교",
      isDone: (o) => o.facts.inCompare || o.facts.selected,
    },
  ],
  connectTargets: [
    { id: "hotel", type: "hotel", labelKo: "숙소" },
    { id: "schedule", type: "schedule", labelKo: "일정" },
    { id: "budget", type: "budget", labelKo: "예산" },
  ],
  askPlaceholderKo: "이 맛집에 대해 물어보세요",
  prepareCtaKo: "예약 검토 생성",
  commitCtaKo: "Field에서 검토",
  simulateEmptyKo: "다른 후보와 바꾸면 어떻게 되는지 보여 줘요",
};

const PLACE: CalloutObjectTypeDescriptor = {
  type: "place",
  labelKo: "장소",
  modes: ALL_MODES,
  intentAxes: [
    { id: "location", labelKo: "위치", nudge: "up" },
    { id: "review", labelKo: "후기", nudge: "up" },
    { id: "route", labelKo: "동선", nudge: "up" },
  ],
  exploreRelations: [
    { id: "hotel", labelKo: "숙소", matchKinds: ["lodging", "hotel"] },
    { id: "restaurant", labelKo: "맛집", matchKinds: ["eatery", "restaurant"] },
    { id: "transit", labelKo: "이동", matchKinds: ["amenity", "route"] },
    { id: "similar", labelKo: "비슷한 장소", matchKinds: ["poi", "place"] },
  ],
  prepareStepDefs: [
    {
      id: "when",
      labelKo: "방문 시점",
      isDone: (o) =>
        o.evidence.some((e) => e.source === "schedule" && e.present),
    },
    {
      id: "route",
      labelKo: "동선 확인",
      isDone: (o) =>
        o.evidence.some((e) => e.type === "distance" && e.present),
    },
    {
      id: "compare",
      labelKo: "후보 비교",
      isDone: (o) => o.facts.inCompare || o.facts.selected,
    },
  ],
  connectTargets: [
    { id: "hotel", type: "hotel", labelKo: "숙소" },
    { id: "restaurant", type: "restaurant", labelKo: "맛집" },
    { id: "schedule", type: "schedule", labelKo: "일정" },
  ],
  askPlaceholderKo: "이 장소에 대해 물어보세요",
  prepareCtaKo: "일정 검토 생성",
  commitCtaKo: "Field에서 검토",
  simulateEmptyKo: "다른 장소로 바꾸면 동선 영향을 보여 줘요",
};

const EVENT: CalloutObjectTypeDescriptor = {
  type: "event",
  labelKo: "이벤트",
  modes: ALL_MODES,
  intentAxes: [
    { id: "time", labelKo: "시간", nudge: "neutral" },
    { id: "price", labelKo: "가격", nudge: "down" },
    { id: "location", labelKo: "위치", nudge: "up" },
  ],
  exploreRelations: [
    { id: "place", labelKo: "장소", matchKinds: ["poi", "place"] },
    { id: "hotel", labelKo: "숙소", matchKinds: ["lodging", "hotel"] },
    { id: "similar", labelKo: "비슷한 이벤트", matchKinds: ["event"] },
  ],
  prepareStepDefs: [
    {
      id: "when",
      labelKo: "일시 확인",
      isDone: (o) =>
        o.evidence.some((e) => e.source === "schedule" && e.present),
    },
    {
      id: "tickets",
      labelKo: "티켓·자리",
      isDone: (o) =>
        o.evidence.some((e) => e.type === "availability" && e.present),
    },
    {
      id: "compare",
      labelKo: "후보 비교",
      isDone: (o) => o.facts.inCompare,
    },
  ],
  connectTargets: [
    { id: "place", type: "place", labelKo: "장소" },
    { id: "schedule", type: "schedule", labelKo: "일정" },
    { id: "budget", type: "budget", labelKo: "예산" },
  ],
  askPlaceholderKo: "이 이벤트에 대해 물어보세요",
  prepareCtaKo: "참여 검토 생성",
  commitCtaKo: "Field에서 검토",
  simulateEmptyKo: "다른 일정으로 바꾸면 영향을 보여 줘요",
};

const PRODUCT: CalloutObjectTypeDescriptor = {
  type: "product",
  labelKo: "상품",
  modes: ALL_MODES,
  intentAxes: [
    { id: "price", labelKo: "가격", nudge: "down" },
    { id: "review", labelKo: "후기", nudge: "up" },
    { id: "shipping", labelKo: "배송", nudge: "up" },
  ],
  exploreRelations: [
    { id: "similar", labelKo: "비슷한 상품", matchKinds: ["product"] },
    { id: "place", labelKo: "픽업·매장", matchKinds: ["poi", "place"] },
  ],
  prepareStepDefs: [
    {
      id: "price",
      labelKo: "가격 확인",
      isDone: (o) => Boolean(o.facts.priceLabelKo),
    },
    {
      id: "options",
      labelKo: "옵션 확인",
      isDone: () => false,
    },
    {
      id: "compare",
      labelKo: "후보 비교",
      isDone: (o) => o.facts.inCompare,
    },
  ],
  connectTargets: [
    { id: "budget", type: "budget", labelKo: "예산" },
    { id: "place", type: "place", labelKo: "수령 장소" },
  ],
  askPlaceholderKo: "이 상품에 대해 물어보세요",
  prepareCtaKo: "구매 검토 생성",
  commitCtaKo: "Field에서 검토",
  simulateEmptyKo: "다른 상품으로 바꾸면 예산 영향을 보여 줘요",
};

const REGISTRY: Record<RimvioObjectType, CalloutObjectTypeDescriptor> = {
  hotel: HOTEL,
  restaurant: RESTAURANT,
  place: PLACE,
  event: EVENT,
  product: PRODUCT,
};

const extraDescriptors = new Map<string, CalloutObjectTypeDescriptor>();

/** Register or override a type — Callout Core stays untouched. */
export function registerCalloutObjectType(
  descriptor: CalloutObjectTypeDescriptor,
): void {
  extraDescriptors.set(descriptor.type, {
    ...descriptor,
    modes: filterCalloutModes(descriptor.modes),
  });
}

export function getCalloutObjectTypeDescriptor(
  type: RimvioObjectType | string,
): CalloutObjectTypeDescriptor | null {
  if (extraDescriptors.has(type)) {
    return extraDescriptors.get(type) ?? null;
  }
  if (type in REGISTRY) {
    return REGISTRY[type as RimvioObjectType];
  }
  return null;
}

export function listCalloutObjectTypes(): readonly CalloutObjectTypeDescriptor[] {
  const base = Object.values(REGISTRY);
  const extras = [...extraDescriptors.values()].filter(
    (d) => !(d.type in REGISTRY) || extraDescriptors.get(d.type) !== REGISTRY[d.type as RimvioObjectType],
  );
  const byType = new Map<string, CalloutObjectTypeDescriptor>();
  for (const d of base) byType.set(d.type, d);
  for (const d of extras) byType.set(d.type, d);
  return [...byType.values()];
}

export const OBJECT_STATE_LABEL_KO: Record<
  import("@/lib/callout/types").RimvioObjectState,
  string
> = {
  discovered: "발견",
  candidate: "후보",
  shortlisted: "단기",
  prepared: "준비",
  committed: "확정",
};

export const CALLOUT_MODE_LABEL_KO: Record<
  import("@/lib/callout/types").CalloutMode,
  string
> = {
  observe: "관찰",
  explore: "탐색",
  simulate: "시험",
  prepare: "준비",
};
