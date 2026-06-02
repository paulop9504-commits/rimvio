import type { EventCandidateCategory } from "@/lib/events/event-candidate";
import {
  getActionContract,
  requiredSlotsForAction,
  type ActionContract,
} from "@/lib/event-kernel/action-contracts/action-contract-registry";

export type MentionFeature = {
  /** Stable registry id — `@navigate`, metadata `mention:navigate` */
  featureId: string;
  displayName: string;
  /** Composer / @ token aliases (lowercase match) */
  aliases: readonly string[];
  /** Linked action contract — optional for NL-only features */
  action?: string;
  sourceRef: string;
  category: EventCandidateCategory;
  confirmCopy?: string;
};

const REGISTRY: readonly MentionFeature[] = [
  {
    featureId: "navigate",
    displayName: "길찾기",
    aliases: ["길찾기", "navigate", "nav", "길", "네비", "네비게이션"],
    action: "NAVIGATE",
    sourceRef: "mention:navigate",
    category: "travel",
    confirmCopy: "어디로 길찾기 할까요?",
  },
  {
    featureId: "weather",
    displayName: "날씨",
    aliases: ["날씨", "weather"],
    action: "WEATHER",
    sourceRef: "mention:weather",
    category: "custom",
    confirmCopy: "어느 지역 날씨를 볼까요?",
  },
  {
    featureId: "meal",
    displayName: "맛집",
    aliases: ["식사", "meal", "밥"],
    action: "MEAL_RECOMMENDATION",
    sourceRef: "mention:meal",
    category: "food",
  },
  {
    featureId: "price",
    displayName: "가격",
    aliases: ["가격", "price"],
    action: "PRICE_LOOKUP",
    sourceRef: "mention:price",
    category: "finance",
    confirmCopy: "무엇의 가격을 확인할까요?",
  },
  {
    featureId: "schedule",
    displayName: "일정정리",
    aliases: ["일정정리", "schedule-organize"],
    action: "SCHEDULE_ORGANIZE",
    sourceRef: "mention:schedule",
    category: "schedule",
  },
  {
    featureId: "reminder",
    displayName: "알림",
    aliases: ["알림", "reminder", "리마인더"],
    sourceRef: "mention:reminder",
    category: "schedule",
    confirmCopy: "언제 알려드릴까요?",
  },
  {
    featureId: "timer",
    displayName: "타이머",
    aliases: ["타이머", "timer"],
    sourceRef: "mention:timer",
    category: "custom",
    confirmCopy: "몇 분 타이머를 돌릴까요? 예: @타이머 5분",
  },
  {
    featureId: "transfer",
    displayName: "송금",
    aliases: ["송금", "transfer", "이체"],
    sourceRef: "mention:transfer",
    category: "finance",
    confirmCopy: "얼마를 보낼까요? 예: @송금 5만원",
  },
  {
    featureId: "parking",
    displayName: "주차",
    aliases: ["주차", "parking"],
    sourceRef: "mention:parking",
    category: "custom",
    confirmCopy: "위치를 적거나 @주차_ 로 사진을 찍어 주세요",
  },
  {
    featureId: "focus",
    displayName: "집중",
    aliases: ["집중", "focus"],
    sourceRef: "mention:focus",
    category: "custom",
    confirmCopy: "몇 시간·몇 분 집중할까요? 예: @집중 1시간",
  },
  {
    featureId: "taxi",
    displayName: "택시",
    aliases: ["택시", "taxi", "t"],
    sourceRef: "mention:taxi",
    category: "travel",
    confirmCopy: "어디로 택시를 부를까요? 예: @택시 강남역",
  },
  {
    featureId: "phone",
    displayName: "전화",
    aliases: ["전화", "phone", "call"],
    sourceRef: "mention:phone",
    category: "custom",
    confirmCopy: "번호나 가게 이름을 적어 주세요.",
  },
  {
    featureId: "paste",
    displayName: "복붙",
    aliases: ["복붙", "paste", "클립보드"],
    sourceRef: "mention:paste",
    category: "custom",
  },
  {
    featureId: "parcel",
    displayName: "택배",
    aliases: ["택배", "parcel", "배송", "송장"],
    sourceRef: "mention:parcel",
    category: "custom",
    confirmCopy: "송장 번호를 적어 주세요.",
  },
  {
    featureId: "link",
    displayName: "링크",
    aliases: ["링크", "link", "url"],
    sourceRef: "mention:link",
    category: "custom",
    confirmCopy: "URL을 붙여 넣거나 적어 주세요.",
  },
  {
    featureId: "dutch",
    displayName: "더치",
    aliases: ["더치", "dutch", "n빈", "n빵"],
    sourceRef: "mention:dutch",
    category: "finance",
    confirmCopy: "예: @더치 84000 4명",
  },
  {
    featureId: "delivery",
    displayName: "배달",
    aliases: ["배달", "delivery", "배민"],
    sourceRef: "mention:delivery",
    category: "food",
    confirmCopy: "무엇을 주문할까요? 예: @배달 치킨",
  },
  {
    featureId: "pickup",
    displayName: "픽업",
    aliases: ["픽업", "pickup"],
    sourceRef: "mention:pickup",
    category: "food",
    confirmCopy: "어디서 픽업할까요? 예: @픽업 스타벅스",
  },
  {
    featureId: "tip",
    displayName: "팁",
    aliases: ["팁", "tip"],
    sourceRef: "mention:tip",
    category: "finance",
    confirmCopy: "금액을 적어 주세요. 예: @팁 35000",
  },
  {
    featureId: "exchange",
    displayName: "환율",
    aliases: ["환율", "exchange", "fx"],
    sourceRef: "mention:exchange",
    category: "finance",
    confirmCopy: "예: @환율 100달러",
  },
  {
    featureId: "gas",
    displayName: "주유",
    aliases: ["주유", "gas", "주유소"],
    sourceRef: "mention:gas",
    category: "travel",
    confirmCopy: "지역을 적어 주세요. 예: @주유 강남",
  },
  {
    featureId: "commute",
    displayName: "출근",
    aliases: ["출근", "commute"],
    sourceRef: "mention:commute",
    category: "schedule",
  },
  {
    featureId: "leave",
    displayName: "퇴근",
    aliases: ["퇴근", "leave", "퇴근길"],
    sourceRef: "mention:leave",
    category: "schedule",
  },
  {
    featureId: "water",
    displayName: "물",
    aliases: ["물", "water", "수분"],
    sourceRef: "mention:water",
    category: "custom",
    confirmCopy: "몇 시간마다 알릴까요? 예: @물 2시간",
  },
  {
    featureId: "exercise",
    displayName: "운동",
    aliases: ["운동", "exercise", "헬스"],
    sourceRef: "mention:exercise",
    category: "custom",
    confirmCopy: "몇 분 운동할까요? 예: @운동 40분",
  },
  {
    featureId: "lunch",
    displayName: "점심",
    aliases: ["점심", "lunch"],
    sourceRef: "mention:lunch",
    category: "schedule",
    confirmCopy: "몇 시에 알릴까요? 예: @점심 12시 30분",
  },
  {
    featureId: "memo",
    displayName: "메모",
    aliases: ["메모", "memo", "note"],
    sourceRef: "mention:memo",
    category: "custom",
    confirmCopy: "메모 내용을 적어 주세요.",
  },
  {
    featureId: "todo",
    displayName: "할일",
    aliases: ["할일", "todo", "할 일"],
    sourceRef: "mention:todo",
    category: "schedule",
    confirmCopy: "할 일과 시간을 적어 주세요.",
  },
  {
    featureId: "receipt",
    displayName: "영수증",
    aliases: ["영수증", "receipt"],
    sourceRef: "mention:receipt",
    category: "finance",
  },
  {
    featureId: "coupon",
    displayName: "쿠폰",
    aliases: ["쿠폰", "coupon"],
    sourceRef: "mention:coupon",
    category: "finance",
    confirmCopy: "만료일과 내용을 적어 주세요.",
  },
  {
    featureId: "umbrella",
    displayName: "우산",
    aliases: ["우산", "umbrella", "비"],
    sourceRef: "mention:umbrella",
    category: "custom",
  },
  {
    featureId: "translate",
    displayName: "번역",
    aliases: ["번역", "translate", "trans"],
    sourceRef: "mention:translate",
    category: "custom",
    confirmCopy: "번역할 문장을 적어 주세요.",
  },
  {
    featureId: "station",
    displayName: "역",
    aliases: ["역", "station", "지하철", "버스"],
    sourceRef: "mention:station",
    category: "travel",
    confirmCopy: "역 이름을 적어 주세요. 예: @역 강남",
  },
  {
    featureId: "now",
    displayName: "지금",
    aliases: ["지금", "now"],
    sourceRef: "mention:now",
    category: "custom",
  },
  {
    featureId: "retry",
    displayName: "다시",
    aliases: ["다시", "retry", "재실행"],
    sourceRef: "mention:retry",
    category: "custom",
  },
  {
    featureId: "capture",
    displayName: "캡처",
    aliases: ["캡처", "capture", "촬영"],
    sourceRef: "mention:capture",
    category: "custom",
  },
  {
    featureId: "dnd",
    displayName: "방해금지",
    aliases: ["방해금지", "dnd", "방해 금지"],
    sourceRef: "mention:dnd",
    category: "custom",
    confirmCopy: "몇 분 방해금지할까요? 예: @방해금지 1시간",
  },
];

const byAlias = new Map<string, MentionFeature>(
  REGISTRY.flatMap((feature) =>
    feature.aliases.map((alias) => [alias.trim().toLowerCase(), feature]),
  ),
);

export type MentionFeatureContract = MentionFeature & {
  contract: ActionContract | null;
  requiredSlots: readonly string[];
};

export function listMentionFeatures(): MentionFeature[] {
  return [...REGISTRY];
}

export function listMentionFeatureTokens(): string[] {
  return REGISTRY.flatMap((feature) => [...feature.aliases]);
}

export function isMentionFeatureToken(token: string): boolean {
  return byAlias.has(token.trim().toLowerCase());
}

export function resolveMentionFeature(token: string): MentionFeature | null {
  return byAlias.get(token.trim().toLowerCase()) ?? null;
}

export function getMentionFeature(featureId: string): MentionFeature | null {
  return REGISTRY.find((feature) => feature.featureId === featureId) ?? null;
}

export function resolveMentionFeatureContract(token: string): MentionFeatureContract | null {
  const feature = resolveMentionFeature(token);
  if (!feature) {
    return null;
  }
  const action = feature.action?.trim();
  const contract = action ? getActionContract(action) : null;
  return {
    ...feature,
    contract,
    requiredSlots: action ? requiredSlotsForAction(action) : [],
  };
}

export function buildMentionContextKey(feature: MentionFeature): string {
  return `event.${feature.category}.${feature.sourceRef}`;
}
