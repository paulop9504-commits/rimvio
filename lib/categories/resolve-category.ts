import type { LinkCategory } from "@/lib/categories/types";
import type { EnrichedLink } from "@/lib/enrichers/types";

const SOURCE_TYPE_CATEGORY: Record<
  EnrichedLink["source_type"],
  LinkCategory | "domain"
> = {
  youtube: "media",
  commerce: "shopping",
  kakao: "social",
  map: "travel",
  transport: "travel",
  github: "research",
  generic: "domain",
};

type DomainRule = {
  pattern: RegExp;
  category: LinkCategory;
};

/** First match wins. Used only for generic enricher fallback. */
const DOMAIN_CATEGORY_RULES: DomainRule[] = [
  {
    pattern:
      /youtube|youtu\.be|netflix|vimeo|twitch|spotify|soundcloud|tver/i,
    category: "media",
  },
  {
    pattern:
      /instagram|twitter|x\.com|facebook|tiktok|threads|open\.kakao|pf\.kakao|kakao\.com\/talk/i,
    category: "social",
  },
  {
    pattern:
      /amazon|coupang|gmarket|11st|musinsa|yo-go|ssg|lotte|shopify|smartstore/i,
    category: "shopping",
  },
  {
    pattern:
      /map\.naver|map\.kakao|google\.com\/maps|airbnb|booking|agoda|trip\.com|hotels|expedia|klook|yanolja|goodchoice/i,
    category: "travel",
  },
  {
    pattern:
      /github|gitlab|stackoverflow|notion|figma|linear|arxiv|wikipedia|medium|substack|docs\.|stripe\.com\/docs/i,
    category: "research",
  },
];

function resolveFromDomain(domain: string, url: string): LinkCategory {
  const target = `${domain} ${url}`.toLowerCase();

  for (const rule of DOMAIN_CATEGORY_RULES) {
    if (rule.pattern.test(target)) {
      return rule.category;
    }
  }

  return "uncategorized";
}

/**
 * Deterministic category from enricher output — no LLM.
 */
export function resolveCategory(enriched: EnrichedLink): LinkCategory {
  const mapped = SOURCE_TYPE_CATEGORY[enriched.source_type];

  if (mapped !== "domain") {
    return mapped;
  }

  return resolveFromDomain(enriched.domain, enriched.url);
}
