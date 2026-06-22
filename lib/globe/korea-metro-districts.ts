import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";

export type KoreaMetroDistrict = {
  city: string;
  district: string;
  label: string;
  lat: number;
  lng: number;
};

/** District names that appear in more than one metro — never match bare 구 alone. */
export const AMBIGUOUS_BARE_DISTRICT_NAMES = new Set([
  "남구",
  "동구",
  "북구",
  "서구",
  "중구",
  "강서구",
]);

function district(
  city: string,
  name: string,
  lat: number,
  lng: number,
): KoreaMetroDistrict {
  return { city, district: name, label: `${city} ${name}`, lat, lng };
}

/** City + district pairs only — no bare 구 patterns. */
export const KOREA_METRO_DISTRICTS: readonly KoreaMetroDistrict[] = [
  // 서울특별시 (25)
  district("서울", "강남구", 37.5172, 127.0473),
  district("서울", "강동구", 37.5301, 127.1238),
  district("서울", "강북구", 37.6396, 127.0257),
  district("서울", "강서구", 37.5509, 126.8495),
  district("서울", "관악구", 37.4784, 126.9516),
  district("서울", "광진구", 37.5384, 127.0822),
  district("서울", "구로구", 37.4954, 126.8874),
  district("서울", "금천구", 37.4519, 126.902),
  district("서울", "노원구", 37.6542, 127.0568),
  district("서울", "도봉구", 37.6688, 127.0471),
  district("서울", "동대문구", 37.5744, 127.0396),
  district("서울", "동작구", 37.5124, 126.9393),
  district("서울", "마포구", 37.5663, 126.9019),
  district("서울", "서대문구", 37.5791, 126.9368),
  district("서울", "서초구", 37.4837, 127.0324),
  district("서울", "성동구", 37.5633, 127.0366),
  district("서울", "성북구", 37.5894, 127.0167),
  district("서울", "송파구", 37.5145, 127.1059),
  district("서울", "양천구", 37.517, 126.8664),
  district("서울", "영등포구", 37.5264, 126.8962),
  district("서울", "용산구", 37.5324, 126.99),
  district("서울", "은평구", 37.6027, 126.9291),
  district("서울", "종로구", 37.5735, 126.9788),
  district("서울", "중구", 37.5636, 126.997),
  district("서울", "중랑구", 37.6063, 127.0925),

  // 부산광역시 (16)
  district("부산", "강서구", 35.2122, 128.98),
  district("부산", "금정구", 35.2429, 129.0921),
  district("부산", "남구", 35.1366, 129.0845),
  district("부산", "동구", 35.1293, 129.0454),
  district("부산", "동래구", 35.2045, 129.078),
  district("부산", "부산진구", 35.1629, 129.0532),
  district("부산", "북구", 35.197, 128.9904),
  district("부산", "사상구", 35.1527, 128.991),
  district("부산", "사하구", 35.1046, 128.974),
  district("부산", "서구", 35.0979, 129.0243),
  district("부산", "수영구", 35.1456, 129.113),
  district("부산", "연제구", 35.1762, 129.0798),
  district("부산", "영도구", 35.0912, 129.0676),
  district("부산", "중구", 35.1063, 129.0323),
  district("부산", "해운대구", 35.163, 129.1636),

  // 대구광역시 (8)
  district("대구", "남구", 35.846, 128.5975),
  district("대구", "달서구", 35.8298, 128.5328),
  district("대구", "동구", 35.8866, 128.6353),
  district("대구", "북구", 35.8857, 128.5829),
  district("대구", "서구", 35.8719, 128.5591),
  district("대구", "수성구", 35.8581, 128.6307),
  district("대구", "중구", 35.8694, 128.6062),
  district("대구", "달성군", 35.7747, 128.4311),

  // 인천광역시 (10)
  district("인천", "계양구", 37.5372, 126.7378),
  district("인천", "남동구", 37.4486, 126.731),
  district("인천", "동구", 37.4739, 126.6432),
  district("인천", "미추홀구", 37.4636, 126.6506),
  district("인천", "부평구", 37.507, 126.7218),
  district("인천", "서구", 37.5457, 126.6766),
  district("인천", "연수구", 37.4101, 126.6788),
  district("인천", "중구", 37.4738, 126.6215),

  // 광주광역시 (5)
  district("광주", "광산구", 35.1398, 126.7937),
  district("광주", "남구", 35.133, 126.9026),
  district("광주", "동구", 35.146, 126.9232),
  district("광주", "북구", 35.174, 126.912),
  district("광주", "서구", 35.152, 126.89),

  // 대전광역시 (5)
  district("대전", "대덕구", 36.3465, 127.4155),
  district("대전", "동구", 36.3244, 127.4548),
  district("대전", "서구", 36.3553, 127.3847),
  district("대전", "유성구", 36.3624, 127.3563),
  district("대전", "중구", 36.3257, 127.42),

  // 울산광역시 (4)
  district("울산", "남구", 35.544, 129.33),
  district("울산", "동구", 35.5048, 129.4169),
  district("울산", "북구", 35.5828, 129.3612),
  district("울산", "중구", 35.5684, 129.3324),
];

const CITY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  서울: ["서울", "서울시", "서울특별시"],
  부산: ["부산", "부산시", "부산광역시"],
  대구: ["대구", "대구시", "대구광역시"],
  인천: ["인천", "인천시", "인천광역시"],
  광주: ["광주", "광주시", "광주광역시"],
  대전: ["대전", "대전시", "대전광역시"],
  울산: ["울산", "울산시", "울산광역시"],
};

function stripSpaces(value: string): string {
  return value.replace(/\s+/g, "");
}

function normalizeDistrictToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/[구군]$/u.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}구`;
}

function extractBareDistrictName(placeLabel: string): string | null {
  const hay = normalizePlaceLabel(placeLabel);
  if (!hay) {
    return null;
  }
  const compact = stripSpaces(hay);
  const withGu = normalizeDistrictToken(compact);
  if (!/[구군]$/u.test(withGu)) {
    return null;
  }
  for (const cityAliases of Object.values(CITY_ALIASES)) {
    for (const alias of cityAliases) {
      if (compact.startsWith(stripSpaces(alias))) {
        return null;
      }
    }
  }
  return withGu;
}

/** Match only when city + district are explicit (e.g. 부산 남구, 부산남구). */
export function matchKoreaMetroDistrict(
  placeLabel: string,
): KoreaMetroDistrict | null {
  const hay = normalizePlaceLabel(placeLabel);
  if (!hay) {
    return null;
  }
  const compact = stripSpaces(hay);

  for (const entry of KOREA_METRO_DISTRICTS) {
    const cityAliases = CITY_ALIASES[entry.city] ?? [entry.city];
    for (const alias of cityAliases) {
      const cityCompact = stripSpaces(alias);
      const districtCompact = stripSpaces(entry.district);
      const fullCompact = `${cityCompact}${districtCompact}`;
      const districtShort = districtCompact.replace(/[구군]$/u, "");

      if (
        compact === fullCompact ||
        compact === `${cityCompact}${districtShort}` ||
        hay === `${alias} ${entry.district}` ||
        hay === `${alias}${entry.district}`
      ) {
        return entry;
      }
    }
  }

  const bareDistrict = extractBareDistrictName(hay);
  if (!bareDistrict || AMBIGUOUS_BARE_DISTRICT_NAMES.has(bareDistrict)) {
    return null;
  }

  const unique = KOREA_METRO_DISTRICTS.filter((row) => row.district === bareDistrict);
  return unique.length === 1 ? unique[0]! : null;
}

/** Bare 구 only — return 2+ city candidates for user pick. */
export function listAmbiguousDistrictCandidates(
  placeLabel: string,
): readonly KoreaMetroDistrict[] | null {
  const bareDistrict = extractBareDistrictName(placeLabel);
  if (!bareDistrict || !AMBIGUOUS_BARE_DISTRICT_NAMES.has(bareDistrict)) {
    return null;
  }
  const matches = KOREA_METRO_DISTRICTS.filter((row) => row.district === bareDistrict);
  return matches.length >= 2 ? matches : null;
}

export function isAmbiguousDistrictOnlyLabel(placeLabel: string): boolean {
  return listAmbiguousDistrictCandidates(placeLabel) !== null;
}

export function formatDistrictPickPrompt(districtName: string): string {
  return `${districtName} — 어느 도시인가요?`;
}
