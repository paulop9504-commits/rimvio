import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

export type MarketProductFamily =
  | "iphone"
  | "galaxy"
  | "ipad"
  | "macbook"
  | null;

export type ParsedMarketProductTitle = {
  family: MarketProductFamily;
  /** Phone / tablet generation — e.g. 15, 16, 24 */
  generation: number | null;
  variant: string | null;
};

const ROLE_NOISE =
  /(?:삽니다|구합니다|구해요?|구함|구매|구입|찾아요|찾습니다|팝니다|팔아요?|판매|나눔|양도)/giu;

function normalizeProductCorpus(text: string): string {
  return text
    .toLowerCase()
    .replace(ROLE_NOISE, " ")
    .replace(/[·|,]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function readMarketIntentProductCorpus(record: MarketIntentRecord): string {
  return normalizeProductCorpus(
    [
      record.detail.productName,
      record.title,
      record.detail.sourceText ?? "",
    ]
      .filter((part) => typeof part === "string" && part.trim())
      .join(" "),
  );
}

export function parseMarketProductTitle(text: string): ParsedMarketProductTitle {
  const q = normalizeProductCorpus(text);
  if (!q) {
    return { family: null, generation: null, variant: null };
  }

  if (/(?:iphone|아이폰)/iu.test(q)) {
    const genMatch = q.match(/(?:iphone|아이폰)\s*(\d{1,2})/iu);
    const generation = genMatch?.[1] ? Number.parseInt(genMatch[1], 10) : null;
    let variant: string | null = null;
    if (/pro\s*max|프로\s*맥스/iu.test(q)) {
      variant = "pro_max";
    } else if (/\bpro\b|프로/iu.test(q)) {
      variant = "pro";
    } else if (/plus|플러스/iu.test(q)) {
      variant = "plus";
    } else if (/mini|미니/iu.test(q)) {
      variant = "mini";
    }
    return { family: "iphone", generation, variant };
  }

  if (/(?:galaxy|갤럭시)/iu.test(q)) {
    const genMatch = q.match(/(?:galaxy|갤럭시)\s*(?:s|a|z|note|fold|flip)?\s*(\d{1,2})/iu);
    const generation = genMatch?.[1] ? Number.parseInt(genMatch[1], 10) : null;
    let variant: string | null = null;
    if (/ultra|울트라/iu.test(q)) variant = "ultra";
    else if (/plus|플러스|\+/iu.test(q)) variant = "plus";
    else if (/fold|플립|flip/iu.test(q)) variant = "fold_flip";
    return { family: "galaxy", generation, variant };
  }

  if (/(?:ipad|아이패드)/iu.test(q)) {
    const genMatch = q.match(/(?:ipad|아이패드)\s*(?:pro|air|mini|프로|에어|미니)?\s*(\d{1,2})?/iu);
    const generation = genMatch?.[1] ? Number.parseInt(genMatch[1], 10) : null;
    return { family: "ipad", generation, variant: null };
  }

  if (/(?:macbook|맥북)/iu.test(q)) {
    return { family: "macbook", generation: null, variant: null };
  }

  return { family: null, generation: null, variant: null };
}

function extractStandaloneGenerations(text: string): number[] {
  const nums = text.match(/\b(1[0-9]|2[0-9])\b/gu) ?? [];
  return [...new Set(nums.map((raw) => Number.parseInt(raw, 10)).filter(Number.isFinite))];
}

function strictCorpusOverlap(seeking: string, listing: string): boolean {
  if (!seeking || !listing) {
    return true;
  }
  if (seeking === listing || listing.includes(seeking) || seeking.includes(listing)) {
    return true;
  }
  const tokens = seeking.split(/\s+/u).filter((token) => token.length >= 2);
  if (tokens.length === 0) {
    return true;
  }
  const hits = tokens.filter((token) => listing.includes(token)).length;
  return hits >= tokens.length;
}

/**
 * Field discovery gate — buyer seeking iPhone 15 must not see iPhone 14/16 rows.
 */
export function isMarketProductTitleMatchForSeeking(
  seeking: MarketIntentRecord,
  listing: MarketIntentRecord,
): boolean {
  const seekText = readMarketIntentProductCorpus(seeking);
  const listText = readMarketIntentProductCorpus(listing);
  if (!seekText || !listText) {
    return true;
  }

  const seekParsed = parseMarketProductTitle(seekText);
  const listParsed = parseMarketProductTitle(listText);

  if (seekParsed.family && listParsed.family && seekParsed.family !== listParsed.family) {
    return false;
  }

  if (
    seekParsed.generation !== null &&
    listParsed.generation !== null &&
    seekParsed.generation !== listParsed.generation
  ) {
    return false;
  }

  if (seekParsed.generation !== null && listParsed.generation === null) {
    const listNums = extractStandaloneGenerations(listText);
    if (listNums.length > 0 && !listNums.includes(seekParsed.generation)) {
      return false;
    }
    if (listParsed.family && seekParsed.family === listParsed.family) {
      return false;
    }
  }

  const seekNums = extractStandaloneGenerations(seekText);
  const listNums = extractStandaloneGenerations(listText);
  if (seekNums.length === 1 && listNums.length >= 1) {
    const target = seekNums[0]!;
    if (!listNums.includes(target)) {
      return false;
    }
  }

  if (
    seekParsed.generation !== null &&
    listParsed.generation !== null &&
    seekParsed.generation === listParsed.generation
  ) {
    const seekWantsPro =
      seekParsed.variant === "pro" || seekParsed.variant === "pro_max";
    const listWantsPro =
      listParsed.variant === "pro" || listParsed.variant === "pro_max";
    if (seekWantsPro && !listWantsPro) {
      return false;
    }
  }

  if (seekParsed.family || seekParsed.generation !== null) {
    return true;
  }

  return strictCorpusOverlap(seekText, listText);
}
