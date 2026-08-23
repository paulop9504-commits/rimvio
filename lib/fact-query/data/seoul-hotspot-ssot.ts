export type SeoulHotspotCategory =
  | "trend"
  | "nightlife"
  | "shopping"
  | "culture"
  | "food";

export type SeoulHotspot = {
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly lat: number;
  readonly lng: number;
  readonly category: SeoulHotspotCategory;
  readonly hotScore: number;
  readonly reasonKo: string;
};

export const SEOUL_HOTSPOTS: readonly SeoulHotspot[] = [
  {
    id: "hongdae",
    nameKo: "홍대",
    nameEn: "Hongdae",
    lat: 37.5572,
    lng: 126.9244,
    category: "nightlife",
    hotScore: 98,
    reasonKo: "클럽·거리공연·MZ 트렌드 1순위",
  },
  {
    id: "gangnam",
    nameKo: "강남",
    nameEn: "Gangnam",
    lat: 37.4979,
    lng: 127.0276,
    category: "shopping",
    hotScore: 96,
    reasonKo: "쇼핑·비즈·야경 허브",
  },
  {
    id: "myeongdong",
    nameKo: "명동",
    nameEn: "Myeongdong",
    lat: 37.5609,
    lng: 126.9863,
    category: "shopping",
    hotScore: 94,
    reasonKo: "관광·K뷰티·스트리트푸드",
  },
  {
    id: "itaewon",
    nameKo: "이태원",
    nameEn: "Itaewon",
    lat: 37.5345,
    lng: 126.9946,
    category: "food",
    hotScore: 91,
    reasonKo: "다국적 먹거리·나이트라이프",
  },
  {
    id: "seongsu",
    nameKo: "성수",
    nameEn: "Seongsu",
    lat: 37.5446,
    lng: 127.0559,
    category: "trend",
    hotScore: 90,
    reasonKo: "팝업·카페·핫플 재개발",
  },
  {
    id: "gwanghwamun",
    nameKo: "광화문",
    nameEn: "Gwanghwamun",
    lat: 37.571,
    lng: 126.9768,
    category: "culture",
    hotScore: 88,
    reasonKo: "경복궁·광장·역사 산책",
  },
  {
    id: "dongdaemun",
    nameKo: "동대문",
    nameEn: "Dongdaemun",
    lat: 37.5663,
    lng: 127.0085,
    category: "shopping",
    hotScore: 86,
    reasonKo: "DDP·야시장·패션",
  },
  {
    id: "yeouido",
    nameKo: "여의도",
    nameEn: "Yeouido",
    lat: 37.5219,
    lng: 126.9245,
    category: "culture",
    hotScore: 84,
    reasonKo: "한강공원·벚꽃·스카이라인",
  },
];
