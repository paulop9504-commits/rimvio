import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";
import type { MarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import { resolveMarketMemoryTemplate } from "@/lib/globe/market/memory/market-memory-template";

const PLACE_SUFFIX = /(?:특별|광역|자치)?시|(?:특별|광역)?도|구|군|동|읍|면|리|역$/u;

function normalizePlaceToken(placeLabel: string): string | null {
  const trimmed = placeLabel.trim();
  if (!trimmed || trimmed.length < 2) {
    return null;
  }
  const parts = trimmed.split(/\s+/u).filter(Boolean);
  const token = parts[parts.length - 1]?.replace(PLACE_SUFFIX, "") ?? trimmed;
  if (token.length < 2) {
    return null;
  }
  return token.slice(0, 12);
}

function categoryTag(categoryId: MarketCategoryId): string | null {
  switch (categoryId) {
    case "market.bike":
      return "라이딩";
    case "market.camera":
      return "기록";
    case "market.camping":
      return "밤";
    case "market.instrument":
      return "연주";
    case "market.outdoor":
      return "산행";
    case "market.phone":
      return "디지털";
    case "market.fashion":
      return "스타일";
    case "market.furniture":
      return "집";
    default:
      return "맥락";
  }
}

const KEYWORD_TAGS: readonly { pattern: RegExp; tag: string }[] = [
  { pattern: /벚꽃|spring|봄/u, tag: "봄" },
  { pattern: /여름|summer|바다/u, tag: "여름" },
  { pattern: /가을|단풍|autumn/u, tag: "가을" },
  { pattern: /겨울|winter|스키/u, tag: "겨울" },
  { pattern: /차박|캠핑|camp/u, tag: "차박" },
  { pattern: /성수|홍대|강남|이태|한남/u, tag: "거리" },
  { pattern: /한강|라이딩|ride/u, tag: "라이딩" },
  { pattern: /등산|산\b|peak/u, tag: "산행" },
  { pattern: /가족|family|아이/u, tag: "가족" },
  { pattern: /여행|travel/u, tag: "여행" },
];

function keywordTags(text: string): string[] {
  const out: string[] = [];
  for (const rule of KEYWORD_TAGS) {
    if (rule.pattern.test(text)) {
      out.push(rule.tag);
    }
  }
  return out;
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    out.push(tag);
  }
  return out.slice(0, 5);
}

/** Deterministic 맥락 태그 — place + category + text keywords. */
export function generateMarketExperienceTags(input: {
  categoryId: MarketCategoryId;
  productName?: string;
  placeLabel?: string;
  memory?: Partial<MarketMemoryRecord> | null;
}): string[] {
  const template = resolveMarketMemoryTemplate(
    input.categoryId,
    input.productName,
  );
  const corpus = [
    input.productName ?? "",
    input.memory?.story ?? "",
    input.memory?.care ?? "",
    input.memory?.why ?? "",
    input.memory?.categoryAnswer ?? "",
    input.memory?.seekingContext ?? "",
    input.memory?.seekingWhy ?? "",
  ].join(" ");

  const tags: string[] = [];
  const place = normalizePlaceToken(input.placeLabel ?? "");
  const cat = categoryTag(input.categoryId);
  if (place && cat) {
    tags.push(`${place}·${cat}`);
  } else if (place) {
    tags.push(`${place}·맥락`);
  } else if (cat) {
    tags.push(cat);
  }

  tags.push(...keywordTags(corpus));

  if (template.id === "camping" && /강원|경기|제주/u.test(corpus)) {
    const region = corpus.match(/(강원|경기|제주|전라|충청|경상)/u)?.[1];
    if (region) {
      tags.push(`${region}·차박`);
    }
  }

  return uniqueTags(tags);
}

export function formatMarketExperienceTagLabel(tag: string): string {
  return tag.startsWith("#") ? tag : tag;
}
