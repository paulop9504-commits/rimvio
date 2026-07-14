import type { DiscoveryEntityClassifyResult, DiscoveryEntityKind } from "@/lib/globe/feed-entity/types";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";

const CAFE_RE =
  /카페|커피|브런치|베이커리|디저트\s*카페|tea\s*house|coffee|cafe|bakery|brunch/iu;
const RESTAURANT_RE =
  /맛집|식당|레스토랑|라멘|스시|초밥|이자카야|야키니쿠|우동|오코노미야키|restaurant|ramen|sushi|izakaya|dining|food\b|eatery/iu;
const SHOPPING_RE =
  /쇼핑|아울렛|아웃렛|백화점|몰|상점가|면세|shopping|outlet|mall|market|bazaar|souq/iu;
const ATTRACTION_RE =
  /놀거리|관광|명소|유니버설|디즈니|박물관|미술관|테마\s*파크|전망대|attraction|sightsee|things\s*to\s*do|museum|theme\s*park|aquarium|zoo/iu;

const LOCATION_RE =
  /(?:^|\s)(오사카|도쿄|교토|후쿠오카|서울|부산|제주|osaka|tokyo|kyoto|fukuoka|seoul|busan|jeju)(?:\s|$)/iu;

function extractLocation(query: string): string | null {
  const match = query.match(LOCATION_RE);
  return match?.[1]?.trim() ?? null;
}

function stripLocation(query: string, location: string | null): string {
  if (!location) {
    return query.trim();
  }
  return query.replace(new RegExp(location, "iu"), "").replace(/\s+/g, " ").trim();
}

/** Step 1 — deterministic entity classification from user query (LLM fallback later). */
export function classifyDiscoveryEntityQuery(
  userQuery: string,
): DiscoveryEntityClassifyResult {
  const query = userQuery.trim();
  const location = extractLocation(query);
  const detail = stripLocation(query, location) || null;

  let entityKind: DiscoveryEntityKind = "restaurant";
  if (hasLodgingDomainCue(query)) {
    entityKind = "hotel";
  } else if (CAFE_RE.test(query) && !RESTAURANT_RE.test(query)) {
    entityKind = "cafe";
  } else if (SHOPPING_RE.test(query)) {
    entityKind = "shopping";
  } else if (ATTRACTION_RE.test(query)) {
    entityKind = "attraction";
  } else if (RESTAURANT_RE.test(query)) {
    entityKind = "restaurant";
  } else if (/놀|구경|나들이|볼거리/iu.test(query)) {
    entityKind = "attraction";
  }

  return {
    entityKind,
    location,
    queryDetail: detail,
    userIntentKo: detail || query || null,
  };
}
