/**
 * Food brand → eateryFocus SSOT (맥도날드, 스타벅스…).
 * Brands are concrete dish slots — never dual-scout lodging.
 */

export type FoodBrandFocus = {
  readonly id: string;
  readonly labelKo: string;
  readonly queryKo: string;
  /** Extra tokens for name matching (JP/EN). */
  readonly matchAliases: readonly string[];
};

const FOOD_BRAND_CATALOG: readonly {
  id: string;
  labelKo: string;
  queryKo: string;
  pattern: RegExp;
  matchAliases: readonly string[];
}[] = [
  {
    id: "mcdonalds",
    labelKo: "맥도날드",
    queryKo: "맥도날드",
    pattern: /맥도날드|맥날|mcdonald'?s?|マクドナルド/iu,
    matchAliases: ["mcdonald", "マクドナルド", "マック"],
  },
  {
    id: "burgerking",
    labelKo: "버거킹",
    queryKo: "버거킹",
    pattern: /버거킹|burger\s*king|バーガーキング/iu,
    matchAliases: ["burger king", "バーガーキング"],
  },
  {
    id: "kfc",
    labelKo: "KFC",
    queryKo: "KFC",
    pattern: /\bkfc\b|케이에프씨|ケンタッキー/iu,
    matchAliases: ["kentucky", "ケンタッキー"],
  },
  {
    id: "starbucks",
    labelKo: "스타벅스",
    queryKo: "스타벅스",
    pattern: /스타벅스|starbucks|スターバックス/iu,
    matchAliases: ["starbucks", "スターバックス"],
  },
  {
    id: "lotteria",
    labelKo: "롯데리아",
    queryKo: "롯데리아",
    pattern: /롯데리아|lotteria/iu,
    matchAliases: ["lotteria"],
  },
];

export function parseFoodBrandFocus(message: string): FoodBrandFocus | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  for (const row of FOOD_BRAND_CATALOG) {
    if (!row.pattern.test(text)) {
      continue;
    }
    return {
      id: row.id,
      labelKo: row.labelKo,
      queryKo: row.queryKo,
      matchAliases: row.matchAliases,
    };
  }
  return null;
}

export function hasFoodBrandCue(message: string): boolean {
  return parseFoodBrandFocus(message) != null;
}

export function foodBrandMatchAliases(
  focus: string | null | undefined,
): readonly string[] {
  const text = focus?.trim() ?? "";
  if (!text) {
    return [];
  }
  for (const row of FOOD_BRAND_CATALOG) {
    if (
      row.queryKo === text ||
      row.labelKo === text ||
      row.pattern.test(text)
    ) {
      return [row.queryKo, row.labelKo, ...row.matchAliases];
    }
  }
  return [];
}
