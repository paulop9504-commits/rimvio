import { normalizeMeaningPerson } from "@/lib/meaning/meaning-node-id";
import type {
  ParsedPersonalContextQuery,
  PersonalContextQueryIntent,
  PersonalContextQueryTarget,
  PersonalContextResponseFocus,
} from "@/lib/personal-context-ask/personal-context-ask-types";

const TRAVEL_PLACE_TOKENS = [
  "제주",
  "부산",
  "강릉",
  "속초",
  "여수",
  "경주",
  "대구",
  "인천",
  "서울",
  "홍대",
  "강남",
  "판교",
  "수원",
  "전주",
  "춘천",
  "양양",
  "포항",
  "울산",
  "광주",
  "대전",
  "제주도",
  "부산역",
  "해운대",
  "상하이",
  "도쿄",
  "오사카",
  "방콕",
  "파리",
  "뉴욕",
] as const;

const FAMILY_PERSON_TOKENS = [
  "엄마",
  "아빠",
  "형",
  "누나",
  "오빠",
  "동생",
  "할머니",
  "할아버지",
  "부모님",
] as const;

const QUERY_STOP_WORDS = new Set([
  "마지막",
  "만난",
  "곳",
  "어디",
  "어디서",
  "갔던",
  "다녀온",
  "맛집",
  "식당",
  "레스토랑",
  "카페",
  "밥",
  "일정",
  "스케줄",
  "약속",
  "이번",
  "다음",
  "주",
  "작년",
  "올해",
  "지난",
  "해",
  "여행",
  "자주",
  "사람",
  "누구",
  "뭐",
  "있어",
  "알려",
  "줘",
  "뭐야",
  "어땠",
  "사진",
  "영상",
  "찍은",
  "꺼내",
  "보여",
  "찾아",
  "에서",
  "좀",
  "꺼내줘",
  "가서",
  "갔어",
  "갔음",
  "언제",
  "언제감",
  "며칠",
  "뭐했",
  "뭐했지",
  "사진좀",
  "동영상",
  "했지",
  "했어",
  "얼마",
  "얼마에",
  "가격",
  "팔았",
  "팔았지",
  "팔았어",
  "넘겼",
  "넘겼지",
  "거래",
  "맞춤",
  "구했",
  "샀",
  "구매",
  "판매",
  "팔아",
  "팔았나",
  "얼마였",
  "얼마였지",
  "얼마였어",
  "얼마지",
  "중고",
  "물건",
]);

function stripPlaceParticle(token: string): string {
  return token.replace(/(에서|으로|까지|에)$/u, "").trim();
}

function extractPersonNeedles(query: string): string[] {
  const needles = new Set<string>();

  for (const match of query.matchAll(/([가-힣a-zA-Z0-9]{1,12})이랑/gu)) {
    const name = normalizeMeaningPerson(match[1] ?? "");
    if (name.length >= 1) {
      needles.add(name);
    }
  }

  const particleMatches = query.matchAll(
    /([가-힣a-zA-Z0-9]{1,12})(?:랑|와|하고|이랑서|와서)/gu,
  );
  for (const match of particleMatches) {
    const name = normalizeMeaningPerson(match[1] ?? "");
    if (name.length >= 1) {
      needles.add(name);
    }
  }

  for (const token of FAMILY_PERSON_TOKENS) {
    if (query.includes(token)) {
      needles.add(normalizeMeaningPerson(token));
    }
  }

  const bareName = query.match(
    /^([가-힣a-zA-Z0-9]{2,8})\s*(?:만난|만났|어디)/u,
  );
  if (bareName?.[1]) {
    needles.add(normalizeMeaningPerson(bareName[1]));
  }

  for (const match of query.matchAll(/(?:with|and)\s+([A-Za-z가-힣]{2,16})\b/giu)) {
    const name = normalizeMeaningPerson(match[1] ?? "");
    if (name.length >= 2) {
      needles.add(name);
    }
  }

  return [...needles];
}

function extractPlaceNeedles(
  query: string,
  personNeedles: readonly string[],
  productNeedles: readonly string[],
): string[] {
  const needles = new Set<string>();
  const lowered = query.toLowerCase();
  const personSet = new Set(personNeedles.map((needle) => needle.toLowerCase()));
  const productSet = new Set(productNeedles.map((needle) => needle.toLowerCase()));

  for (const token of TRAVEL_PLACE_TOKENS) {
    if (lowered.includes(token.toLowerCase())) {
      needles.add(token);
    }
  }

  const tokens = query
    .replace(/[?!.,]/gu, " ")
    .split(/\s+/u)
    .map((part) => stripPlaceParticle(part.trim()))
    .filter((part) => part.length >= 2 && !QUERY_STOP_WORDS.has(part));

  for (const token of tokens) {
    const loweredToken = token.toLowerCase();
    if (personSet.has(loweredToken)) {
      continue;
    }
    if (productSet.has(loweredToken)) {
      continue;
    }
    if (FAMILY_PERSON_TOKENS.includes(token as (typeof FAMILY_PERSON_TOKENS)[number])) {
      continue;
    }
    if (personNeedles.some((person) => loweredToken.startsWith(person.toLowerCase()))) {
      continue;
    }
    needles.add(token);
  }

  return [...needles];
}

const MARKET_PRODUCT_SIGNAL =
  /(?:얼마|가격|팔았|넘겼|넘김|맞춤|거래|구했|샀|구매|판매|중고)/u;

function extractProductNeedles(
  query: string,
  personNeedles: readonly string[],
): string[] {
  if (!MARKET_PRODUCT_SIGNAL.test(query)) {
    return [];
  }
  const needles = new Set<string>();
  const personSet = new Set(personNeedles.map((needle) => needle.toLowerCase()));

  const tokens = query
    .replace(/[?!.,]/gu, " ")
    .split(/\s+/u)
    .map((part) => stripPlaceParticle(part.trim()))
    .filter((part) => part.length >= 2 && !QUERY_STOP_WORDS.has(part));

  for (const token of tokens) {
    const lowered = token.toLowerCase();
    if (personSet.has(lowered)) {
      continue;
    }
    needles.add(token);
  }

  return [...needles];
}

function readYear(query: string, nowYear: number): number | null {
  if (/작년|지난\s*해/u.test(query)) {
    return nowYear - 1;
  }
  if (/올해/u.test(query)) {
    return nowYear;
  }
  const explicit = query.match(/(20\d{2})\s*년?/u);
  if (explicit?.[1]) {
    return Number.parseInt(explicit[1], 10);
  }
  return null;
}

function readWeekOffset(query: string): 0 | 1 | null {
  if (/다음\s*주/u.test(query)) {
    return 1;
  }
  if (/이번\s*주/u.test(query)) {
    return 0;
  }
  return null;
}

function readTarget(query: string): PersonalContextQueryTarget {
  if (/사진|영상|동영상|셀카|찍은|꺼내|갤러리/u.test(query)) {
    return "photo";
  }
  return "general";
}

function readResponseFocus(
  query: string,
  target: PersonalContextQueryTarget,
): PersonalContextResponseFocus {
  if (target === "photo") {
    return "photos";
  }
  if (/언제|몇\s*월|날짜|며칠|갔어|갔음|언제감/u.test(query)) {
    return "when";
  }
  if (/뭐\s*했|뭐했지|뭐\s*했지/u.test(query)) {
    return "activity";
  }
  return "general";
}

function detectIntent(
  query: string,
  personNeedles: readonly string[],
  placeNeedles: readonly string[],
  productNeedles: readonly string[],
  year: number | null,
): PersonalContextQueryIntent {
  if (
    /팔았|넘겼|넘김|판매했|팔았지|얼마에\s*팔|얼마에\s*넘/u.test(query) &&
    /얼마|가격/u.test(query)
  ) {
    return "sell_price_recall";
  }
  if (
    /맞춤|거래|넘김|구했|샀|구매했/u.test(query) &&
    (productNeedles.length > 0 || /얼마|가격/u.test(query))
  ) {
    return "market_trade_recall";
  }
  if (/일정|스케줄|약속/u.test(query) && /이번\s*주|다음\s*주/u.test(query)) {
    return "schedule_week";
  }
  if (/마지막|만난\s*곳|어디서\s*만/u.test(query) && personNeedles.length > 0) {
    return "last_meet_place";
  }
  if (
    personNeedles.length > 0 &&
    /(?:어디\s*(?:갔|가|다녀)|갔던\s*곳|다녀온\s*곳|where\s+(?:did|we))/iu.test(query)
  ) {
    return "bridge_context";
  }
  if (/맛집|식당|레스토랑|카페|밥\s*먹/u.test(query) && personNeedles.length > 0) {
    return "place_with_person";
  }
  if (personNeedles.length > 0 && placeNeedles.length > 0) {
    return "bridge_context";
  }
  if (
    /여행|다녀온|갔던|다녀/u.test(query) ||
    (year !== null && placeNeedles.length > 0)
  ) {
    return "travel_recall";
  }
  if (/자주\s*만난/u.test(query)) {
    return "frequent_person";
  }
  return "general";
}

/** Pure parse — Korean ask patterns into retrieval slots. */
export function parsePersonalContextQuery(
  raw: string,
  now = new Date(),
): ParsedPersonalContextQuery {
  const query = raw.trim();
  const personNeedles = extractPersonNeedles(query);
  const productNeedles = extractProductNeedles(query, personNeedles);
  const placeNeedles = extractPlaceNeedles(query, personNeedles, productNeedles);
  const year = readYear(query, now.getFullYear());
  const target = readTarget(query);
  const responseFocus = readResponseFocus(query, target);
  const intent = detectIntent(
    query,
    personNeedles,
    placeNeedles,
    productNeedles,
    year,
  );

  return {
    raw: query,
    intent,
    target,
    responseFocus,
    personNeedles,
    placeNeedles,
    productNeedles,
    year,
    weekOffset: readWeekOffset(query),
    foodRelated: /맛집|식당|레스토랑|카페|밥\s*먹/u.test(query),
  };
}
