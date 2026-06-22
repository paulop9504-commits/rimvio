import {
  isAmbiguousDistrictOnlyLabel,
  matchKoreaMetroDistrict,
} from "@/lib/globe/korea-metro-districts";
import { matchKoreaKnownNeighborhood } from "@/lib/globe/korea-known-neighborhoods";
import { matchKoreaKnownPoi } from "@/lib/globe/korea-known-pois";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";

export type KoreaKnownPlace = {
  pattern: RegExp;
  label: string;
  lat: number;
  lng: number;
};

/**
 * Sync fallback when API geocode is unavailable.
 * All 75 administrative 시 + 세종 + common Seoul districts.
 * Order matters — more specific patterns first (e.g. 경기 광주 before 광주광역시).
 */
export const KOREA_KNOWN_PLACES: readonly KoreaKnownPlace[] = [
  // —— Specific disambiguation (before homonyms) ——
  { pattern: /경기\s*광주/u, label: "경기 광주", lat: 37.4138, lng: 127.2558 },
  { pattern: /서귀포/u, label: "서귀포", lat: 33.2541, lng: 126.5601 },

  // —— 1. 특별시 · 광역시 (7) ——
  { pattern: /서울/u, label: "서울", lat: 37.5665, lng: 126.978 },
  { pattern: /부산|해운대|서면/u, label: "부산", lat: 35.1796, lng: 129.0756 },
  { pattern: /대구/u, label: "대구", lat: 35.8714, lng: 128.6014 },
  { pattern: /인천|송도|부평/u, label: "인천", lat: 37.4563, lng: 126.7052 },
  { pattern: /광주/u, label: "광주", lat: 35.1595, lng: 126.8526 },
  { pattern: /대전|둔산/u, label: "대전", lat: 36.3504, lng: 127.3845 },
  { pattern: /울산/u, label: "울산", lat: 35.5384, lng: 129.3114 },

  // —— 세종특별자치시 (geocode fallback) ——
  { pattern: /세종/u, label: "세종", lat: 36.48, lng: 127.289 },

  // —— 2. 특례시 (4) ——
  { pattern: /수원/u, label: "수원", lat: 37.2636, lng: 127.0286 },
  { pattern: /고양|일산|킨텍스/u, label: "고양", lat: 37.6584, lng: 126.832 },
  { pattern: /용인|기흥|수지/u, label: "용인", lat: 37.2411, lng: 127.1776 },
  { pattern: /창원/u, label: "창원", lat: 35.2285, lng: 128.6811 },

  // —— 3. 경기도 (24) ——
  { pattern: /성남|분당|판교|정자/u, label: "성남", lat: 37.42, lng: 127.1265 },
  { pattern: /부천/u, label: "부천", lat: 37.5034, lng: 126.766 },
  { pattern: /안산/u, label: "안산", lat: 37.3219, lng: 126.8309 },
  { pattern: /화성|동탄/u, label: "화성", lat: 37.199, lng: 126.831 },
  { pattern: /남양주/u, label: "남양주", lat: 37.636, lng: 127.2165 },
  { pattern: /안양/u, label: "안양", lat: 37.3943, lng: 126.9568 },
  { pattern: /평택/u, label: "평택", lat: 36.992, lng: 127.1129 },
  { pattern: /시흥/u, label: "시흥", lat: 37.38, lng: 126.803 },
  { pattern: /파주/u, label: "파주", lat: 37.7597, lng: 126.78 },
  { pattern: /의정부/u, label: "의정부", lat: 37.7381, lng: 127.0338 },
  { pattern: /김포/u, label: "김포", lat: 37.615, lng: 126.715 },
  { pattern: /광명/u, label: "광명", lat: 37.478, lng: 126.8645 },
  { pattern: /군포/u, label: "군포", lat: 37.361, lng: 126.935 },
  { pattern: /하남/u, label: "하남", lat: 37.539, lng: 127.214 },
  { pattern: /오산/u, label: "오산", lat: 37.149, lng: 127.077 },
  { pattern: /양주/u, label: "양주", lat: 37.785, lng: 127.045 },
  { pattern: /이천/u, label: "이천", lat: 37.272, lng: 127.442 },
  { pattern: /구리/u, label: "구리", lat: 37.594, lng: 127.129 },
  { pattern: /안성/u, label: "안성", lat: 37.008, lng: 127.279 },
  { pattern: /포천/u, label: "포천", lat: 37.894, lng: 127.2 },
  { pattern: /의왕/u, label: "의왕", lat: 37.345, lng: 126.975 },
  { pattern: /여주/u, label: "여주", lat: 37.298, lng: 127.637 },
  { pattern: /동두천/u, label: "동두천", lat: 37.903, lng: 127.06 },

  // —— 4. 강원특별자치도 (7) ——
  { pattern: /춘천/u, label: "춘천", lat: 37.8813, lng: 127.7298 },
  { pattern: /원주/u, label: "원주", lat: 37.342, lng: 127.92 },
  { pattern: /강릉/u, label: "강릉", lat: 37.7519, lng: 128.876 },
  { pattern: /동해/u, label: "동해", lat: 37.524, lng: 129.114 },
  { pattern: /태백/u, label: "태백", lat: 37.164, lng: 128.986 },
  { pattern: /속초/u, label: "속초", lat: 38.207, lng: 128.5918 },
  { pattern: /삼척/u, label: "삼척", lat: 37.45, lng: 129.165 },

  // —— 5. 충청북도 (3) ——
  { pattern: /청주/u, label: "청주", lat: 36.6424, lng: 127.489 },
  { pattern: /충주/u, label: "충주", lat: 37.87, lng: 127.852 },
  { pattern: /제천/u, label: "제천", lat: 37.132, lng: 128.191 },

  // —— 6. 충청남도 (8) ——
  { pattern: /천안/u, label: "천안", lat: 36.815, lng: 127.113 },
  { pattern: /아산/u, label: "아산", lat: 36.79, lng: 127.002 },
  { pattern: /서산/u, label: "서산", lat: 36.785, lng: 126.45 },
  { pattern: /당진/u, label: "당진", lat: 36.894, lng: 126.63 },
  { pattern: /논산/u, label: "논산", lat: 36.187, lng: 127.098 },
  { pattern: /공주/u, label: "공주", lat: 36.446, lng: 127.119 },
  { pattern: /보령/u, label: "보령", lat: 36.333, lng: 126.612 },
  { pattern: /계룡/u, label: "계룡", lat: 36.274, lng: 127.248 },

  // —— 7. 전북특별자치도 (6) ——
  { pattern: /전주/u, label: "전주", lat: 35.8242, lng: 127.148 },
  { pattern: /익산/u, label: "익산", lat: 35.948, lng: 126.958 },
  { pattern: /군산/u, label: "군산", lat: 35.967, lng: 126.736 },
  { pattern: /정읍/u, label: "정읍", lat: 35.57, lng: 126.856 },
  { pattern: /남원/u, label: "남원", lat: 35.416, lng: 127.39 },
  { pattern: /김제/u, label: "김제", lat: 35.803, lng: 126.881 },

  // —— 8. 전라남도 (5) ——
  { pattern: /여수/u, label: "여수", lat: 34.7604, lng: 127.6622 },
  { pattern: /순천/u, label: "순천", lat: 34.95, lng: 127.487 },
  { pattern: /목포/u, label: "목포", lat: 34.812, lng: 126.392 },
  { pattern: /광양/u, label: "광양", lat: 34.94, lng: 127.696 },
  { pattern: /나주/u, label: "나주", lat: 35.015, lng: 126.711 },

  // —— 9. 경상북도 (10) ——
  { pattern: /포항/u, label: "포항", lat: 36.019, lng: 129.3435 },
  { pattern: /구미/u, label: "구미", lat: 36.119, lng: 128.344 },
  { pattern: /경주/u, label: "경주", lat: 35.8562, lng: 129.2247 },
  { pattern: /김천/u, label: "김천", lat: 36.139, lng: 128.113 },
  { pattern: /안동/u, label: "안동", lat: 36.5684, lng: 128.7294 },
  { pattern: /영주/u, label: "영주", lat: 36.806, lng: 128.623 },
  { pattern: /영천/u, label: "영천", lat: 35.973, lng: 128.938 },
  { pattern: /상주/u, label: "상주", lat: 36.415, lng: 128.16 },
  { pattern: /문경/u, label: "문경", lat: 36.586, lng: 128.186 },
  { pattern: /경산/u, label: "경산", lat: 35.825, lng: 128.741 },

  // —— 10. 경상남도 (7) ——
  { pattern: /김해/u, label: "김해", lat: 35.234, lng: 128.889 },
  { pattern: /양산/u, label: "양산", lat: 35.338, lng: 129.034 },
  { pattern: /진주/u, label: "진주", lat: 35.1802, lng: 128.1076 },
  { pattern: /거제/u, label: "거제", lat: 34.88, lng: 128.621 },
  { pattern: /통영/u, label: "통영", lat: 34.8544, lng: 128.4331 },
  { pattern: /사천/u, label: "사천", lat: 35.004, lng: 128.064 },
  { pattern: /밀양/u, label: "밀양", lat: 35.504, lng: 128.746 },

  // —— 11. 제주특별자치도 (2) ——
  { pattern: /제주|애월|성산/u, label: "제주", lat: 33.4996, lng: 126.5312 },

  // —— Seoul districts (not 시 — common search hints) ——
  { pattern: /강남역|강남/u, label: "강남역", lat: 37.498, lng: 127.028 },
  { pattern: /홍대|연남|마포/u, label: "홍대", lat: 37.557, lng: 126.924 },
  { pattern: /성수/u, label: "성수", lat: 37.544, lng: 127.055 },
  { pattern: /신림/u, label: "신림동", lat: 37.4842, lng: 126.9295 },
  { pattern: /사당/u, label: "사당", lat: 37.4768, lng: 126.9817 },
  { pattern: /건대|건국대/u, label: "건대", lat: 37.5404, lng: 127.0692 },
  { pattern: /잠실/u, label: "잠실", lat: 37.5133, lng: 127.1002 },
  { pattern: /명동|을지로/u, label: "명동", lat: 37.5636, lng: 126.985 },
];

/** Canonical list of 75 시 names (for tests). 세종 · 서울 districts excluded. */
export const KOREA_SI_CITY_NAMES = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산",
  "수원", "고양", "용인", "창원",
  "성남", "부천", "안산", "화성", "남양주", "안양", "평택", "시흥", "파주", "의정부", "김포", "경기 광주", "광명", "군포", "하남", "오산", "양주", "이천", "구리", "안성", "포천", "의왕", "여주", "동두천",
  "춘천", "원주", "강릉", "동해", "태백", "속초", "삼척",
  "청주", "충주", "제천",
  "천안", "아산", "서산", "당진", "논산", "공주", "보령", "계룡",
  "전주", "익산", "군산", "정읍", "남원", "김제",
  "여수", "순천", "목포", "광양", "나주",
  "포항", "구미", "경주", "김천", "안동", "영주", "영천", "상주", "문경", "경산",
  "김해", "양산", "진주", "거제", "통영", "사천", "밀양",
  "제주", "서귀포",
] as const;

export function matchKoreaKnownCity(placeLabel: string): KoreaKnownPlace | null {
  const hay = normalizePlaceLabel(placeLabel);
  if (!hay) {
    return null;
  }
  for (const entry of KOREA_KNOWN_PLACES) {
    if (entry.pattern.test(hay)) {
      return entry;
    }
  }
  return null;
}

function metroDistrictAsKnownPlace(
  placeLabel: string,
): KoreaKnownPlace | null {
  const hit = matchKoreaMetroDistrict(placeLabel);
  if (!hit) {
    return null;
  }
  return {
    pattern: /.*/u,
    label: hit.label,
    lat: hit.lat,
    lng: hit.lng,
  };
}

/** POI → 동·읍 → metro 구(시+구) → 시. Bare ambiguous 구 (남구 등) returns null. */
export function matchKoreaKnownPlace(placeLabel: string): KoreaKnownPlace | null {
  const poi = matchKoreaKnownPoi(placeLabel);
  if (poi) {
    return poi;
  }
  const neighborhood = matchKoreaKnownNeighborhood(placeLabel);
  if (neighborhood) {
    return neighborhood;
  }
  const district = metroDistrictAsKnownPlace(placeLabel);
  if (district) {
    return district;
  }
  if (isAmbiguousDistrictOnlyLabel(placeLabel)) {
    return null;
  }
  return matchKoreaKnownCity(placeLabel);
}
