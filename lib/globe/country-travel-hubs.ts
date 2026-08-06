/**
 * Multi-hub country destinations — country ≠ city.
 * User says "필리핀" → country frame + hub chips; city confirms Execution Space.
 * Unframed countries derive hubs from overseas city registry + 「기타」 blank.
 */

import { listOverseasCitiesForCountry } from "@/lib/globe/overseas-place-registry";

export type CountryTravelHub = {
  readonly id: string;
  readonly labelKo: string;
  readonly aliases: readonly string[];
};

export type CountryTravelFrame = {
  readonly countryId: string;
  readonly labelKo: string;
  readonly aliases: readonly string[];
  /** Popular hubs only — not every island/city. Rest → NL + Nominatim. */
  readonly hubs: readonly CountryTravelHub[];
  readonly pickPromptKo: string;
};

const FRAMES: readonly CountryTravelFrame[] = [
  {
    countryId: "philippines",
    labelKo: "필리핀",
    aliases: ["philippines", "ph"],
    hubs: [
      { id: "manila", labelKo: "마닐라", aliases: ["manila", "마닐라"] },
      { id: "cebu", labelKo: "세부", aliases: ["cebu", "세부", "세부시"] },
      { id: "boracay", labelKo: "보라카이", aliases: ["boracay", "보라카이"] },
      { id: "palawan", labelKo: "팔라완", aliases: ["palawan", "팔라완", "엘니도", "el nido"] },
      { id: "bohol", labelKo: "보홀", aliases: ["bohol", "보홀"] },
    ],
    pickPromptKo: "어느 섬·도시부터 할까요? 마닐라 · 세부 · 보라카이 · 팔라완 · 보홀",
  },
  {
    countryId: "japan",
    labelKo: "일본",
    aliases: ["japan", "jp"],
    hubs: [
      { id: "osaka", labelKo: "오사카", aliases: ["osaka", "오사카", "大阪"] },
      { id: "tokyo", labelKo: "도쿄", aliases: ["tokyo", "도쿄", "東京"] },
      { id: "fukuoka", labelKo: "후쿠오카", aliases: ["fukuoka", "후쿠오카", "福岡"] },
      { id: "sapporo", labelKo: "삿포로", aliases: ["sapporo", "삿포로"] },
      { id: "okinawa", labelKo: "오키나와", aliases: ["okinawa", "오키나와"] },
    ],
    pickPromptKo: "어디부터 시작할까요? 오사카 · 도쿄 · 후쿠오카 · 삿포로 · 오키나와",
  },
  {
    countryId: "indonesia",
    labelKo: "인도네시아",
    aliases: ["indonesia", "id"],
    hubs: [
      { id: "bali", labelKo: "발리", aliases: ["bali", "발리", "덴파사르"] },
      { id: "jakarta", labelKo: "자카르타", aliases: ["jakarta", "자카르타"] },
      { id: "yogyakarta", labelKo: "족자카르타", aliases: ["yogyakarta", "jogja", "족자"] },
    ],
    pickPromptKo: "어디부터 할까요? 발리 · 자카르타 · 족자카르타",
  },
  {
    countryId: "thailand",
    labelKo: "태국",
    aliases: ["thailand", "thai"],
    hubs: [
      { id: "bangkok", labelKo: "방콕", aliases: ["bangkok", "방콕"] },
      { id: "phuket", labelKo: "푸켓", aliases: ["phuket", "푸켓"] },
      { id: "chiangmai", labelKo: "치앙마이", aliases: ["chiang mai", "치앙마이"] },
      { id: "pattaya", labelKo: "파타야", aliases: ["pattaya", "파타야"] },
    ],
    pickPromptKo: "어디부터 할까요? 방콕 · 푸켓 · 치앙마이 · 파타야",
  },
  {
    countryId: "vietnam",
    labelKo: "베트남",
    aliases: ["vietnam", "vn"],
    hubs: [
      { id: "danang", labelKo: "다낭", aliases: ["da nang", "다낭"] },
      { id: "hanoi", labelKo: "하노이", aliases: ["hanoi", "하노이"] },
      { id: "hcmc", labelKo: "호치민", aliases: ["ho chi minh", "호치민", "사이공"] },
      { id: "nhatrang", labelKo: "나트랑", aliases: ["nha trang", "나트랑"] },
    ],
    pickPromptKo: "어디부터 할까요? 다낭 · 하노이 · 호치민 · 나트랑",
  },
  {
    countryId: "greece",
    labelKo: "그리스",
    aliases: ["greece", "gr"],
    hubs: [
      { id: "athens", labelKo: "아테네", aliases: ["athens", "아테네"] },
      { id: "santorini", labelKo: "산토리니", aliases: ["santorini", "산토리니"] },
      { id: "mykonos", labelKo: "미코노스", aliases: ["mykonos", "미코노스"] },
      { id: "crete", labelKo: "크레타", aliases: ["crete", "크레타"] },
    ],
    pickPromptKo: "어느 섬·도시부터 할까요? 아테네 · 산토리니 · 미코노스 · 크레타",
  },
  {
    countryId: "usa",
    labelKo: "미국",
    aliases: ["usa", "united states", "america", "미국본토"],
    hubs: [
      { id: "hawaii", labelKo: "하와이", aliases: ["hawaii", "하와이"] },
      { id: "nyc", labelKo: "뉴욕", aliases: ["new york", "뉴욕", "nyc"] },
      { id: "la", labelKo: "로스앤젤레스", aliases: ["los angeles", "LA", "로스앤젤레스"] },
      { id: "lasvegas", labelKo: "라스베이거스", aliases: ["las vegas", "라스베이거스"] },
      { id: "sf", labelKo: "샌프란시스코", aliases: ["san francisco", "샌프란"] },
    ],
    pickPromptKo: "어디부터 할까요? 하와이 · 뉴욕 · 로스앤젤레스 · 라스베이거스 · 샌프란시스코",
  },
  {
    countryId: "australia",
    labelKo: "호주",
    aliases: ["australia", "au"],
    hubs: [
      { id: "sydney", labelKo: "시드니", aliases: ["sydney", "시드니"] },
      { id: "melbourne", labelKo: "멜버른", aliases: ["melbourne", "멜버른"] },
      { id: "brisbane", labelKo: "브리즈번", aliases: ["brisbane", "브리즈번"] },
      { id: "goldcoast", labelKo: "골드코스트", aliases: ["gold coast", "골드코스트"] },
    ],
    pickPromptKo: "어디부터 할까요? 시드니 · 멜버른 · 브리즈번 · 골드코스트",
  },
  {
    countryId: "malaysia",
    labelKo: "말레이시아",
    aliases: ["malaysia", "my"],
    hubs: [
      { id: "kl", labelKo: "쿠알라룸푸르", aliases: ["kuala lumpur", "쿠알라룸푸르", "KL"] },
      { id: "penang", labelKo: "페낭", aliases: ["penang", "페낭"] },
      { id: "langkawi", labelKo: "랑카위", aliases: ["langkawi", "랑카위"] },
    ],
    pickPromptKo: "어디부터 할까요? 쿠알라룸푸르 · 페낭 · 랑카위",
  },
  {
    countryId: "korea",
    labelKo: "한국",
    aliases: ["korea", "남한", "대한민국", "south korea"],
    hubs: [
      { id: "seoul", labelKo: "서울", aliases: ["seoul", "서울"] },
      { id: "busan", labelKo: "부산", aliases: ["busan", "부산"] },
      { id: "jeju", labelKo: "제주", aliases: ["jeju", "제주", "제주도"] },
      { id: "gangneung", labelKo: "강릉", aliases: ["gangneung", "강릉"] },
    ],
    pickPromptKo: "어디부터 할까요? 서울 · 부산 · 제주 · 강릉",
  },
];

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function listCountryTravelFrames(): readonly CountryTravelFrame[] {
  return FRAMES;
}

/** Exact/alias match for a country-scale label (not a city hub). */
export function matchCountryTravelFrame(
  label: string | null | undefined,
): CountryTravelFrame | null {
  const raw = label?.trim();
  if (!raw) return null;
  const n = normalize(raw);
  for (const frame of FRAMES) {
    if (normalize(frame.labelKo) === n) return frame;
    if (frame.aliases.some((a) => normalize(a) === n)) return frame;
    // "필리핀 여행" style — country token as whole-ish label
    if (n === normalize(frame.labelKo) || frame.aliases.some((a) => n === normalize(a))) {
      return frame;
    }
  }
  // Contained match only when label is short (country word alone or + 여행)
  if (raw.length <= 16) {
    for (const frame of FRAMES) {
      if (
        n.includes(normalize(frame.labelKo)) ||
        frame.aliases.some((a) => n.includes(normalize(a)))
      ) {
        // Avoid matching hub city that contains country? e.g. skip if equals a hub
        const asHub = matchHubInAnyFrame(raw);
        if (asHub) return null;
        return frame;
      }
    }
  }
  return null;
}

export function matchHubInFrame(
  frame: CountryTravelFrame,
  text: string,
): CountryTravelHub | null {
  const n = normalize(text);
  for (const hub of frame.hubs) {
    if (normalize(hub.labelKo) === n) return hub;
    if (hub.aliases.some((a) => normalize(a) === n || n.includes(normalize(a)))) {
      return hub;
    }
    if (text.includes(hub.labelKo)) return hub;
  }
  return null;
}

export function matchHubInAnyFrame(
  text: string,
): { frame: CountryTravelFrame; hub: CountryTravelHub } | null {
  for (const frame of FRAMES) {
    const hub = matchHubInFrame(frame, text);
    if (hub) return { frame, hub };
  }
  return null;
}

/** True when label is a multi-hub country — city must stay unresolved. */
export function isMultiHubCountryDestination(
  label: string | null | undefined,
): boolean {
  return matchCountryTravelFrame(label) != null;
}

export function listHubLabelsForCountry(
  countryLabel: string | null | undefined,
): readonly string[] {
  const frame = matchCountryTravelFrame(countryLabel);
  if (frame) {
    return frame.hubs.map((h) => h.labelKo);
  }
  return listOverseasCitiesForCountry(countryLabel).map((c) => c.label);
}

export function hubChoiceRowsForCountry(
  countryLabel: string | null | undefined,
): readonly { id: string; label: string }[] {
  const frame = matchCountryTravelFrame(countryLabel);
  if (frame) {
    return frame.hubs.map((h) => ({ id: h.id, label: h.labelKo }));
  }
  return listOverseasCitiesForCountry(countryLabel).map((c) => ({
    id: `city-${c.label}`,
    label: c.label,
  }));
}

export function pickPromptForCountry(
  countryLabel: string | null | undefined,
): string | null {
  const frame = matchCountryTravelFrame(countryLabel);
  if (frame) return frame.pickPromptKo;
  const hubs = listHubLabelsForCountry(countryLabel);
  const country = countryLabel?.trim();
  if (!country) return null;
  if (hubs.length === 0) {
    return `${country} · 어느 도시로 가시나요? 직접 입력하거나 「기타」를 눌러 주세요`;
  }
  const preview = hubs.slice(0, 5).join(" · ");
  return `${country} · 어디부터 할까요? ${preview}${hubs.length > 5 ? " · …" : ""} · 기타`;
}

/** Default Japan-style hubs when region unknown (no country yet). */
export const FALLBACK_DESTINATION_HUBS = [
  { id: "osaka", label: "오사카" },
  { id: "tokyo", label: "도쿄" },
  { id: "fukuoka", label: "후쿠오카" },
] as const;

export const DESTINATION_OTHER_CHIP_ID = "trip-dest-other";
export const DESTINATION_OTHER_LABEL_KO = "기타";
