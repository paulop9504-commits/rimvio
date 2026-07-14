/** Multi-cuisine intent → disambiguation choices (cicada CLARIFYING). */

export type CuisineCandidate = {
  readonly id: string;
  readonly labelKo: string;
  readonly queryKo: string;
};

const CUISINE_CATALOG: readonly {
  id: string;
  labelKo: string;
  queryKo: string;
  pattern: RegExp;
  /** Drop these when this specialty hits (avoid menuFocus pause). */
  suppresses?: readonly string[];
}[] = [
  {
    id: "matcha_icecream",
    labelKo: "말차 아이스크림",
    queryKo: "말차 아이스크림",
    pattern:
      /(?:말차|녹차|matcha|抹茶).{0,20}(?:아이스\s*크림|아이스크림|소프트|젤라토|ice\s*cream|ソフトクリーム)|(?:아이스\s*크림|아이스크림|소프트\s*크림|젤라토|ice\s*cream).{0,16}(?:말차|녹차|matcha|抹茶)/iu,
    suppresses: ["matcha", "dessert", "cafe", "beverage", "juice"],
  },
  {
    id: "matcha",
    labelKo: "말차",
    queryKo: "말차",
    pattern: /말차|matcha|抹茶/iu,
    suppresses: ["dessert", "cafe", "beverage", "juice"],
  },
  { id: "pizza", labelKo: "피자", queryKo: "피자", pattern: /피자|pizza/iu },
  {
    id: "chicken",
    labelKo: "치킨",
    queryKo: "치킨",
    pattern: /치킨|치킨집|fried\s*chicken|chicken/iu,
  },
  { id: "sushi", labelKo: "스시", queryKo: "스시 초밥", pattern: /스시|초밥|sushi/iu },
  { id: "ramen", labelKo: "라멘", queryKo: "라멘", pattern: /라멘|ramen|ラーメン/iu },
  {
    id: "yakitori",
    labelKo: "야키토리",
    queryKo: "야키토리",
    pattern: /야키토리|yakitori|焼き鳥/iu,
  },
  {
    id: "yakiniku",
    labelKo: "야키니쿠",
    queryKo: "야키니쿠",
    pattern: /야키니쿠|yakiniku|焼肉|고기\s*구이/iu,
  },
  {
    id: "okonomiyaki",
    labelKo: "오코노미야키",
    queryKo: "오코노미야키",
    pattern: /오코노미야키|okonomiyaki|お好み焼き/iu,
  },
  {
    id: "takoyaki",
    labelKo: "타코야키",
    queryKo: "타코야키",
    pattern: /타코야키|takoyaki|たこ焼き/iu,
  },
  {
    id: "udon",
    labelKo: "우동",
    queryKo: "우동",
    pattern: /우동|udon|うどん/iu,
  },
  {
    id: "tempura",
    labelKo: "덴푸라",
    queryKo: "덴푸라",
    pattern: /덴푸라|tempura|天ぷら/iu,
  },
  {
    id: "tonkatsu",
    labelKo: "돈카츠",
    queryKo: "돈카츠",
    pattern: /돈카츠|tonkatsu|豚カツ|돈가스/iu,
  },
  {
    id: "izakaya",
    labelKo: "이자카야",
    queryKo: "이자카야",
    pattern: /이자카야|izakaya|居酒屋/iu,
  },
  {
    id: "kakigori",
    labelKo: "빙수",
    queryKo: "말차 빙수",
    pattern:
      /(?:말차|녹차|matcha|抹茶).{0,12}(?:빙수|かき氷|kakigori)|(?:빙수|かき氷).{0,12}(?:말차|녹차|matcha)/iu,
    suppresses: ["dessert", "cafe", "beverage", "juice"],
  },
  { id: "cafe", labelKo: "카페", queryKo: "카페", pattern: /카페|coffee|cafe/iu },
  {
    id: "beverage",
    labelKo: "음료",
    queryKo: "카페 음료",
    pattern: /음료|음료수|드링크|drink|beverage/iu,
  },
  { id: "juice", labelKo: "주스", queryKo: "주스 카페", pattern: /주스|juice/iu },
  {
    id: "dessert",
    labelKo: "디저트",
    queryKo: "디저트 카페",
    pattern: /디저트|dessert|베이커리|bakery/iu,
  },
];

export function parseCuisineCandidates(message: string): CuisineCandidate[] {
  const text = message.trim();
  if (!text) {
    return [];
  }
  const found: CuisineCandidate[] = [];
  const suppressed = new Set<string>();
  for (const row of CUISINE_CATALOG) {
    if (!row.pattern.test(text)) {
      continue;
    }
    found.push({ id: row.id, labelKo: row.labelKo, queryKo: row.queryKo });
    for (const id of row.suppresses ?? []) {
      suppressed.add(id);
    }
  }
  if (suppressed.size === 0) {
    return found;
  }
  return found.filter((row) => !suppressed.has(row.id));
}

export function resolveCuisineFocusQuery(focusId: string | null | undefined): string | null {
  const id = focusId?.trim();
  if (!id) {
    return null;
  }
  return CUISINE_CATALOG.find((row) => row.id === id)?.queryKo ?? null;
}

export function parseSingleCuisineFocus(message: string): string | null {
  const candidates = parseCuisineCandidates(message);
  if (candidates.length !== 1) {
    return null;
  }
  return candidates[0]?.queryKo ?? null;
}

/** True when search should stay on specialty dessert (skip Bib / generic bakery mix). */
export function isSpecialtyDessertEateryFocus(
  focus: string | null | undefined,
): boolean {
  const text = focus?.trim() ?? "";
  if (!text) {
    return false;
  }
  return /말차|녹차|matcha|抹茶|아이스\s*크림|아이스크림|소프트|젤라토|ice\s*cream/iu.test(
    text,
  );
}
