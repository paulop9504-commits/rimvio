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
}[] = [
  { id: "pizza", labelKo: "피자", queryKo: "피자", pattern: /피자|pizza/iu },
  {
    id: "chicken",
    labelKo: "치킨",
    queryKo: "치킨",
    pattern: /치킨|치킨집|fried\s*chicken|chicken/iu,
  },
  { id: "sushi", labelKo: "스시", queryKo: "스시 초밥", pattern: /스시|초밥|sushi/iu },
  { id: "ramen", labelKo: "라멘", queryKo: "라멘", pattern: /라멘|ramen/iu },
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
  for (const row of CUISINE_CATALOG) {
    if (row.pattern.test(text)) {
      found.push({ id: row.id, labelKo: row.labelKo, queryKo: row.queryKo });
    }
  }
  return found;
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
