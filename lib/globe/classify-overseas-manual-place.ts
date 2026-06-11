export type OverseasPlaceKind = "country" | "city";

export type OverseasManualPlaceHint = {
  isOverseas: true;
  kind: OverseasPlaceKind;
  /** User-facing label — e.g. 상하이 */
  label: string;
  /** Country name for UI — e.g. 중국 */
  countryLabel: string;
  /** Geocode-optimized query */
  geocodeQuery: string;
  lat: number;
  lng: number;
};

type OverseasPlaceEntry = {
  pattern: RegExp;
  label: string;
  countryLabel: string;
  geocodeQuery: string;
  lat: number;
  lng: number;
  kind: OverseasPlaceKind;
};

/** Cities first — longer / more specific matches win. */
const OVERSEAS_PLACES: readonly OverseasPlaceEntry[] = [
  {
    pattern: /(?:^|[\s,·])상하이(?:[\s,·]|$)|shanghai/iu,
    label: "상하이",
    countryLabel: "중국",
    geocodeQuery: "Shanghai China",
    lat: 31.2304,
    lng: 121.4737,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])베이징|북경|beijing|peking/iu,
    label: "베이징",
    countryLabel: "중국",
    geocodeQuery: "Beijing China",
    lat: 39.9042,
    lng: 116.4074,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])홍콩|hong\s*kong/iu,
    label: "홍콩",
    countryLabel: "홍콩",
    geocodeQuery: "Hong Kong",
    lat: 22.3193,
    lng: 114.1694,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])타이베이|대만(?:[\s,·]|$)|taipei|taiwan/iu,
    label: "타이베이",
    countryLabel: "대만",
    geocodeQuery: "Taipei Taiwan",
    lat: 25.033,
    lng: 121.5654,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])도쿄|東京|tokyo/iu,
    label: "도쿄",
    countryLabel: "일본",
    geocodeQuery: "Tokyo Japan",
    lat: 35.6762,
    lng: 139.6503,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])오사카|大阪|osaka/iu,
    label: "오사카",
    countryLabel: "일본",
    geocodeQuery: "Osaka Japan",
    lat: 34.6937,
    lng: 135.5023,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])교토|京都|kyoto/iu,
    label: "교토",
    countryLabel: "일본",
    geocodeQuery: "Kyoto Japan",
    lat: 35.0116,
    lng: 135.7681,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])후쿠오카|福岡|fukuoka/iu,
    label: "후쿠오카",
    countryLabel: "일본",
    geocodeQuery: "Fukuoka Japan",
    lat: 33.5904,
    lng: 130.4017,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])방콕|bangkok/iu,
    label: "방콕",
    countryLabel: "태국",
    geocodeQuery: "Bangkok Thailand",
    lat: 13.7563,
    lng: 100.5018,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])다낭|da\s*nang/iu,
    label: "다낭",
    countryLabel: "베트남",
    geocodeQuery: "Da Nang Vietnam",
    lat: 16.0544,
    lng: 108.2022,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])하노이|hanoi/iu,
    label: "하노이",
    countryLabel: "베트남",
    geocodeQuery: "Hanoi Vietnam",
    lat: 21.0285,
    lng: 105.8542,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])호치민|ho\s*chi\s*minh/iu,
    label: "호치민",
    countryLabel: "베트남",
    geocodeQuery: "Ho Chi Minh City Vietnam",
    lat: 10.8231,
    lng: 106.6297,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])싱가포르|singapore/iu,
    label: "싱가포르",
    countryLabel: "싱가포르",
    geocodeQuery: "Singapore",
    lat: 1.3521,
    lng: 103.8198,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])파리|paris/iu,
    label: "파리",
    countryLabel: "프랑스",
    geocodeQuery: "Paris France",
    lat: 48.8566,
    lng: 2.3522,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])런던|london/iu,
    label: "런던",
    countryLabel: "영국",
    geocodeQuery: "London UK",
    lat: 51.5074,
    lng: -0.1278,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])뉴욕|new\s*york/iu,
    label: "뉴욕",
    countryLabel: "미국",
    geocodeQuery: "New York USA",
    lat: 40.7128,
    lng: -74.006,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])로스앤젤레스|los\s*angeles/iu,
    label: "로스앤젤레스",
    countryLabel: "미국",
    geocodeQuery: "Los Angeles USA",
    lat: 34.0522,
    lng: -118.2437,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])샌프란(?:시스코)?|san\s*francisco/iu,
    label: "샌프란시스코",
    countryLabel: "미국",
    geocodeQuery: "San Francisco USA",
    lat: 37.7749,
    lng: -122.4194,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])시드니|sydney/iu,
    label: "시드니",
    countryLabel: "호주",
    geocodeQuery: "Sydney Australia",
    lat: -33.8688,
    lng: 151.2093,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])두바이|dubai/iu,
    label: "두바이",
    countryLabel: "UAE",
    geocodeQuery: "Dubai UAE",
    lat: 25.2048,
    lng: 55.2708,
    kind: "city",
  },
  {
    pattern: /(?:^|[\s,·])중국|china/iu,
    label: "중국",
    countryLabel: "중국",
    geocodeQuery: "China",
    lat: 39.9042,
    lng: 116.4074,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])일본|japan/iu,
    label: "일본",
    countryLabel: "일본",
    geocodeQuery: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])태국|thailand/iu,
    label: "태국",
    countryLabel: "태국",
    geocodeQuery: "Thailand",
    lat: 13.7563,
    lng: 100.5018,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])베트남|vietnam/iu,
    label: "베트남",
    countryLabel: "베트남",
    geocodeQuery: "Vietnam",
    lat: 21.0285,
    lng: 105.8542,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])미국|usa|u\.?\s*s\.?\s*a|america/iu,
    label: "미국",
    countryLabel: "미국",
    geocodeQuery: "United States",
    lat: 40.7128,
    lng: -74.006,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])영국|uk|united\s*kingdom|britain/iu,
    label: "영국",
    countryLabel: "영국",
    geocodeQuery: "United Kingdom",
    lat: 51.5074,
    lng: -0.1278,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])프랑스|france/iu,
    label: "프랑스",
    countryLabel: "프랑스",
    geocodeQuery: "France",
    lat: 48.8566,
    lng: 2.3522,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])독일|germany/iu,
    label: "독일",
    countryLabel: "독일",
    geocodeQuery: "Germany",
    lat: 52.52,
    lng: 13.405,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])호주|australia/iu,
    label: "호주",
    countryLabel: "호주",
    geocodeQuery: "Australia",
    lat: -33.8688,
    lng: 151.2093,
    kind: "country",
  },
  {
    pattern: /(?:^|[\s,·])유럽|europe/iu,
    label: "유럽",
    countryLabel: "유럽",
    geocodeQuery: "Europe",
    lat: 48.8566,
    lng: 2.3522,
    kind: "country",
  },
];

const DOMESTIC_GUARD =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|[가-힣]{2,8}동|[가-힣]{2,8}역)/u;

function normalizeHaystack(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** True when place text looks like an overseas country or city — not domestic KR. */
export function classifyOverseasManualPlace(
  raw: string,
): OverseasManualPlaceHint | null {
  const hay = normalizeHaystack(raw);
  if (!hay) {
    return null;
  }

  for (const entry of OVERSEAS_PLACES) {
    if (!entry.pattern.test(hay)) {
      continue;
    }
    if (entry.kind === "country" && DOMESTIC_GUARD.test(hay) && !entry.pattern.test(hay)) {
      continue;
    }
    return {
      isOverseas: true,
      kind: entry.kind,
      label: entry.label,
      countryLabel: entry.countryLabel,
      geocodeQuery: entry.geocodeQuery,
      lat: entry.lat,
      lng: entry.lng,
    };
  }

  return null;
}

export function overseasPlaceConfirmPrompt(hint: OverseasManualPlaceHint): string {
  if (hint.kind === "country") {
    return `${hint.label} — 어느 도시였나요? 후보에서 골라 주세요`;
  }
  return `${hint.label}(${hint.countryLabel}) — 지도에서 맞는 위치를 골라 주세요`;
}
