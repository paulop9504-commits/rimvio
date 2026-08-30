/**
 * Natural-language Workspace control — same state as clicking filters.
 * Click [한식] and “한식만 보여줘” both set the same filter.
 */

export type WorkspaceCuisineId =
  | "korean"
  | "chinese"
  | "japanese"
  | "western"
  | "chicken"
  | "cafe"
  | "snack"
  | "meat"
  | "seafood";

type CuisineSpec = {
  readonly id: WorkspaceCuisineId;
  readonly tag: string;
  readonly needles: readonly string[];
};

const CUISINES: readonly CuisineSpec[] = [
  {
    id: "korean",
    tag: "cuisine:korean",
    needles: ["한식", "한식당", "korean", "김치찌개", "된장찌개"],
  },
  {
    id: "chinese",
    tag: "cuisine:chinese",
    needles: ["중식", "중국집", "chinese", "짜장", "짬뽕"],
  },
  {
    id: "japanese",
    tag: "cuisine:japanese",
    needles: ["일식", "japanese", "스시", "초밥", "라멘", "우동"],
  },
  {
    id: "western",
    tag: "cuisine:western",
    needles: ["양식", "western", "파스타", "스테이크", "피자"],
  },
  {
    id: "chicken",
    tag: "cuisine:chicken",
    needles: ["치킨", "chicken", "후라이드"],
  },
  {
    id: "cafe",
    tag: "cuisine:cafe",
    needles: ["카페", "cafe", "커피", "coffee", "디저트"],
  },
  {
    id: "snack",
    tag: "cuisine:snack",
    needles: ["분식", "떡볶이", "김밥"],
  },
  {
    id: "meat",
    tag: "cuisine:meat",
    needles: ["고기", "고기집", "삼겹", "갈비", "barbecue", "bbq"],
  },
  {
    id: "seafood",
    tag: "cuisine:seafood",
    needles: ["해산물", "회", "seafood", "횟집"],
  },
];

export type WorkspaceNlControl = {
  readonly cuisine: CuisineSpec | null;
  readonly minRating: number | null;
  readonly maxPriceKrw: number | null;
  readonly sortBy: "price" | "rating" | "value" | null;
};

export function inferCuisineTags(blob: string): string[] {
  const text = blob.toLowerCase();
  return CUISINES.filter((c) =>
    c.needles.some((n) => text.includes(n.toLowerCase())),
  ).map((c) => c.tag);
}

export function parseCuisineFromText(text: string): CuisineSpec | null {
  const lower = text.toLowerCase();
  return (
    CUISINES.find((c) =>
      c.needles.some((n) => lower.includes(n.toLowerCase())),
    ) ?? null
  );
}

export function parseMinRatingFromText(text: string): number | null {
  const exact = text.match(/(\d(?:\.\d)?)\s*점\s*(?:이상|↑|\+)/u);
  if (exact?.[1]) {
    const n = Number(exact[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 5) {
      return n;
    }
  }
  if (/리뷰\s*좋|평점\s*높|별점\s*높|top\s*rated/iu.test(text)) {
    return 4;
  }
  return null;
}

export function blobMatchesCuisine(
  blob: string,
  tags: readonly string[],
  cuisine: CuisineSpec,
): boolean {
  if (tags.includes(cuisine.tag)) {
    return true;
  }
  const lower = blob.toLowerCase();
  return cuisine.needles.some((n) => lower.includes(n.toLowerCase()));
}

export function isWorkspaceNlControlUtterance(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (parseCuisineFromText(t)) return true;
  if (parseMinRatingFromText(t) != null) return true;
  if (/만\s*(?:보여|남겨|남기|해줘)|이하만|이상만|안쪽|이내/iu.test(t)) {
    return true;
  }
  if (/가까운\s*순|데이트하기\s*좋|사람\s*적은/iu.test(t)) {
    return true;
  }
  return false;
}
