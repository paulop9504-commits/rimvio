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
