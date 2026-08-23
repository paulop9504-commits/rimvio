export type TokyoHotspotCategory =
  | "trend"
  | "nightlife"
  | "shopping"
  | "culture"
  | "food";

export type TokyoHotspot = {
  readonly id: string;
  readonly nameKo: string;
  readonly nameJa: string;
  readonly lat: number;
  readonly lng: number;
  readonly category: TokyoHotspotCategory;
  readonly hotScore: number;
  readonly reasonKo: string;
};

/** Curated hotspot index — deterministic rank, not LLM. */
export const TOKYO_HOTSPOTS: readonly TokyoHotspot[] = [
  {
    id: "shibuya",
    nameKo: "시부야",
    nameJa: "渋谷",
    lat: 35.658,
    lng: 139.7016,
    category: "trend",
    hotScore: 98,
    reasonKo: "스크램블·쇼핑·야경 — 관광·트렌드 1순위",
  },
  {
    id: "shinjuku",
    nameKo: "신주쿠",
    nameJa: "新宿",
    lat: 35.6896,
    lng: 139.7006,
    category: "nightlife",
    hotScore: 96,
    reasonKo: "야경·식당·숙박 허브",
  },
  {
    id: "harajuku",
    nameKo: "하라주쿠",
    nameJa: "原宿",
    lat: 35.6702,
    lng: 139.7027,
    category: "trend",
    hotScore: 92,
    reasonKo: "스트릿·카페·패션",
  },
  {
    id: "asakusa",
    nameKo: "아사쿠사",
    nameJa: "浅草",
    lat: 35.7108,
    lng: 139.7967,
    category: "culture",
    hotScore: 90,
    reasonKo: "센소지·전통 거리",
  },
  {
    id: "ginza",
    nameKo: "긴자",
    nameJa: "銀座",
    lat: 35.6717,
    lng: 139.765,
    category: "shopping",
    hotScore: 88,
    reasonKo: "럭셔리·쇼핑·미식",
  },
  {
    id: "akihabara",
    nameKo: "아키하바라",
    nameJa: "秋葉原",
    lat: 35.6984,
    lng: 139.7731,
    category: "culture",
    hotScore: 86,
    reasonKo: "전자·애니·서브컬처",
  },
  {
    id: "roppongi",
    nameKo: "롯폰기",
    nameJa: "六本木",
    lat: 35.6628,
    lng: 139.7314,
    category: "nightlife",
    hotScore: 84,
    reasonKo: "야경·바·미술관",
  },
  {
    id: "odaiba",
    nameKo: "오다이바",
    nameJa: "お台場",
    lat: 35.6268,
    lng: 139.7765,
    category: "trend",
    hotScore: 82,
    reasonKo: "바다뷰·팀랩·데이트",
  },
  {
    id: "ueno",
    nameKo: "우에노",
    nameJa: "上野",
    lat: 35.7138,
    lng: 139.7774,
    category: "culture",
    hotScore: 80,
    reasonKo: "박물관·공원·아메요코",
  },
  {
    id: "skytree",
    nameKo: "도쿄 스카이트리",
    nameJa: "東京スカイツリー",
    lat: 35.7101,
    lng: 139.8107,
    category: "culture",
    hotScore: 78,
    reasonKo: "랜드마크·전망",
  },
];
