import type { BrainSurfaceCandidateFamily } from "@/lib/situation-projection/brain-surface-types";
import type { CountryCode } from "@/lib/links/spark-locale";

export type CuratedTravelKnowledgeItem = {
  id: string;
  family: Extract<BrainSurfaceCandidateFamily, "info" | "event">;
  title: string;
  summaryKo: string;
  badgeLabelKo: string;
  sourceLabelKo: string;
  sourceUrl: string;
  evidenceKind: "official" | "guide" | "public";
  countryCodes: readonly CountryCode[];
  cityTokens?: readonly string[];
  validMonths?: readonly number[];
  tags: readonly string[];
  focusAffinityFamilies?: readonly BrainSurfaceCandidateFamily[];
};

export const CURATED_TRAVEL_KNOWLEDGE: readonly CuratedTravelKnowledgeItem[] = [
  {
    id: "jp-year-round-battery",
    family: "info",
    title: "보조배터리 하나 챙겨두기",
    summaryKo:
      "일본에서는 카페나 식당에 충전 자리가 항상 있는 편이 아니라, 이동 중 배터리가 끊기지 않도록 보조배터리를 챙겨두면 동선이 덜 흔들려요.",
    badgeLabelKo: "현지 팁",
    sourceLabelKo: "Japan guide",
    sourceUrl: "https://matcha-jp.com/en/14657",
    evidenceKind: "guide",
    countryCodes: ["JP"],
    tags: ["etiquette", "charging", "transit"],
    focusAffinityFamilies: ["media", "lodging", "eatery", "info", "event", "memo"],
  },
  {
    id: "jp-ic-card",
    family: "info",
    title: "교통카드 먼저 맞추기",
    summaryKo:
      "일본 일정이 여러 역과 환승을 포함하면 IC 카드나 패스 정보를 먼저 맞춰두는 편이 식사·숙소 이동까지 한 번에 부드러워져요.",
    badgeLabelKo: "이동 준비",
    sourceLabelKo: "Japan Travel",
    sourceUrl: "https://www.japan.travel/en/plan/getting-around/",
    evidenceKind: "official",
    countryCodes: ["JP"],
    tags: ["transit_pass", "transit", "route"],
    focusAffinityFamilies: ["lodging", "eatery", "info", "event", "memo"],
  },
  {
    id: "jp-rainy-season",
    family: "event",
    title: "초여름 비 시즌 대비",
    summaryKo:
      "6-7월 일본 일정이면 비 예보와 실내 동선을 같이 보는 편이 좋아요. 우산, 실내 스팟, 이동 템포를 미리 맞추면 하루 리듬이 덜 끊겨요.",
    badgeLabelKo: "시즌 흐름",
    sourceLabelKo: "Japan Weather Guide",
    sourceUrl: "https://www.japan.travel/en/guide/weather-in-japan/",
    evidenceKind: "official",
    countryCodes: ["JP"],
    validMonths: [6, 7],
    tags: ["weather", "seasonal", "photo"],
    focusAffinityFamilies: ["lodging", "info", "event", "memo"],
  },
  {
    id: "kyoto-gion-matsuri",
    family: "event",
    title: "교토 기온마쓰리 동선 확인",
    summaryKo:
      "7월 교토라면 기온마쓰리 시기와 겹치는지 먼저 보는 편이 좋아요. 중심가가 붐비고 이동 속도가 달라져서 식사·숙소 계획도 같이 흔들릴 수 있어요.",
    badgeLabelKo: "계절 행사",
    sourceLabelKo: "Kyoto Travel",
    sourceUrl: "https://kyoto.travel/en/see-and-do/festivals/gion_matsuri.html",
    evidenceKind: "official",
    countryCodes: ["JP"],
    cityTokens: ["교토", "kyoto"],
    validMonths: [7],
    tags: ["seasonal", "event", "route", "crowd"],
    focusAffinityFamilies: ["eatery", "lodging", "info", "event", "memo"],
  },
  {
    id: "jp-winter-illumination",
    family: "event",
    title: "겨울 일루미네이션 시간대 보기",
    summaryKo:
      "11-1월 일본 도시는 일루미네이션 시간대가 저녁 동선과 잘 붙는 경우가 많아요. 밤 산책이나 사진 일정이 있으면 식사·이동 시간을 저녁 쪽으로 모아보는 편이 좋아요.",
    badgeLabelKo: "겨울 시즌",
    sourceLabelKo: "Japan Travel",
    sourceUrl: "https://www.japan.travel/en/guide/winter-illuminations-in-japan/",
    evidenceKind: "official",
    countryCodes: ["JP"],
    validMonths: [11, 12, 1],
    tags: ["seasonal", "photo", "night", "event"],
    focusAffinityFamilies: ["media", "eatery", "info", "event", "memo"],
  },
  {
    id: "kyoto-sakura",
    family: "event",
    title: "벚꽃 시기 혼잡도 먼저 보기",
    summaryKo:
      "3-4월 교토라면 벚꽃 시기 혼잡도가 동선에 크게 영향을 줘요. 사진 스팟과 식사 시간을 분산해서 잡는 편이 체감 밀도가 덜 높아요.",
    badgeLabelKo: "봄 시즌",
    sourceLabelKo: "Kyoto Travel",
    sourceUrl: "https://kyoto.travel/en/see-and-do/seasonal/cherry_blossoms.html",
    evidenceKind: "official",
    countryCodes: ["JP"],
    cityTokens: ["교토", "kyoto"],
    validMonths: [3, 4],
    tags: ["seasonal", "photo", "event", "crowd"],
    focusAffinityFamilies: ["media", "eatery", "info", "event", "memo"],
  },
];
