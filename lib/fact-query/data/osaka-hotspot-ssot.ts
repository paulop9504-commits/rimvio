export type OsakaHotspotCategory =
  | "trend"
  | "food"
  | "culture"
  | "shopping";

export type OsakaHotspot = {
  readonly id: string;
  readonly nameKo: string;
  readonly nameJa: string;
  readonly lat: number;
  readonly lng: number;
  readonly category: OsakaHotspotCategory;
  readonly hotScore: number;
  readonly reasonKo: string;
};

export const OSAKA_HOTSPOTS: readonly OsakaHotspot[] = [
  {
    id: "dotonbori",
    nameKo: "도톤보리",
    nameJa: "道頓堀",
    lat: 34.6687,
    lng: 135.5013,
    category: "food",
    hotScore: 97,
    reasonKo: "글리코 간판·길거리 먹거리 1순위",
  },
  {
    id: "umeda",
    nameKo: "우메다",
    nameJa: "梅田",
    lat: 34.7055,
    lng: 135.4983,
    category: "shopping",
    hotScore: 94,
    reasonKo: "쇼핑·야경·교통 허브",
  },
  {
    id: "namba",
    nameKo: "난바",
    nameJa: "難波",
    lat: 34.6654,
    lng: 135.5013,
    category: "trend",
    hotScore: 92,
    reasonKo: "난바 파크·쇼핑·환승",
  },
  {
    id: "osaka-castle",
    nameKo: "오사카성",
    nameJa: "大阪城",
    lat: 34.6873,
    lng: 135.5262,
    category: "culture",
    hotScore: 90,
    reasonKo: "랜드마크·공원·박물관",
  },
  {
    id: "shinsekai",
    nameKo: "신세카이",
    nameJa: "新世界",
    lat: 34.6525,
    lng: 135.5063,
    category: "food",
    hotScore: 88,
    reasonKo: "쿠시카츠·츠utenkaku",
  },
  {
    id: "usj",
    nameKo: "USJ",
    nameJa: "ユニバーサル",
    lat: 34.6654,
    lng: 135.4323,
    category: "culture",
    hotScore: 86,
    reasonKo: "테마파크·가족 여행",
  },
  {
    id: "kuromon",
    nameKo: "쿠로몬 시장",
    nameJa: "黒門市場",
    lat: 34.6655,
    lng: 135.5067,
    category: "food",
    hotScore: 84,
    reasonKo: "아침 시장·해산물",
  },
  {
    id: "tennoji",
    nameKo: "텐노지",
    nameJa: "天王寺",
    lat: 34.6464,
    lng: 135.5135,
    category: "shopping",
    hotScore: 82,
    reasonKo: "아베노 하루카스·쇼핑",
  },
];
