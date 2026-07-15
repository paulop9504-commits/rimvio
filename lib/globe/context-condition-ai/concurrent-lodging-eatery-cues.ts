/**
 * Multi-domain discovery — user can ask for any combination of
 * lodging · eatery · activity · amenity in one turn. No sector-count ceiling.
 */

import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import { parseCuisineCandidates } from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import { hasFoodBrandCue } from "@/lib/globe/context-condition-ai/parse-food-brand-focus";
import { utteranceHasConcreteDishSlot } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
import type { LocalDiscoveryResourceType } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  parseActivityFocusDetail,
  parseAmenityFocus,
} from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";

const EATERY_SHOP_NOUN =
  /(?:집|맛집|식당|가게|카페|디저트|아이스\s*크림|아이스크림|소프트|젤라토)/iu;

const ACTIVITY_BROAD =
  /놀거리|놀\s*거리|즐길\s*거리|관광|관광지|명소|볼거리|액티비티|things\s*to\s*do|attraction|activit(?:y|ies)/iu;

const LODGING_CUE =
  /호텔|숙소|캡슐|게스트\s*하우스|호스텔|hostel|hotel|lodging|guesthouse|료칸|민박|에어비앤비|airbnb/iu;

const EATERY_CUE =
  /맛집|식당|카페|아이스\s*크림|아이스크림|말차|초밥|스시|라멘|디저트|restaurant|cafe|matcha|sushi|ramen/iu;

const ACTIVITY_CUE =
  /놀거리|관광|명소|유니버설|디즈니|테마\s*파크|수족관|박물관|미술관|공원|야경|포토\s*스팟|attraction|museum|park|beach/iu;

const AMENITY_CUE =
  /약국|편의점|은행|atm|병원|주유소|마트|세탁|우체국|pharmacy|convenience|hospital/iu;

/** Concrete eatery ask — cuisine, brand, dish slot, or *집 noun. */
export function hasConcreteConcurrentEateryCue(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (hasFoodBrandCue(trimmed) || utteranceHasConcreteDishSlot(trimmed)) {
    return true;
  }
  if (parseCuisineCandidates(trimmed).length > 0) {
    return true;
  }
  if (isInstantEaterySearch(trimmed)) {
    return true;
  }
  if (hasEateryDomainCue(trimmed) && EATERY_SHOP_NOUN.test(trimmed)) {
    return true;
  }
  return false;
}

export type ConcurrentDiscoveryDomainHit = {
  readonly resourceType: LocalDiscoveryResourceType;
  /** First match index in utterance — earlier = higher feed sector order. */
  readonly mentionIndex: number;
};

function firstIndex(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  return match?.index ?? -1;
}

/**
 * Detect every discovery domain the user named.
 * Ordered by first mention. No maximum sector count.
 */
export function detectConcurrentDiscoveryDomains(
  text: string,
): ConcurrentDiscoveryDomainHit[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const hits: ConcurrentDiscoveryDomainHit[] = [];

  if (hasLodgingDomainCue(trimmed)) {
    const lodgingAt = firstIndex(trimmed, LODGING_CUE);
    hits.push({
      resourceType: "hotel",
      mentionIndex: lodgingAt >= 0 ? lodgingAt : 0,
    });
  }

  if (hasConcreteConcurrentEateryCue(trimmed)) {
    const eateryAt = firstIndex(trimmed, EATERY_CUE);
    hits.push({
      resourceType: "restaurant",
      mentionIndex: eateryAt >= 0 ? eateryAt : 0,
    });
  }

  const amenityFocus = parseAmenityFocus(trimmed);
  if (amenityFocus) {
    const amenityAt = firstIndex(trimmed, AMENITY_CUE);
    hits.push({
      resourceType: "amenity",
      mentionIndex: amenityAt >= 0 ? amenityAt : 0,
    });
  }

  const activityFocus = parseActivityFocusDetail(trimmed);
  const wantsActivity =
    Boolean(activityFocus) || ACTIVITY_BROAD.test(trimmed);
  if (wantsActivity) {
    const activityAt = firstIndex(trimmed, ACTIVITY_CUE);
    const broadAt = firstIndex(trimmed, ACTIVITY_BROAD);
    hits.push({
      resourceType: "activity",
      mentionIndex:
        activityAt >= 0 ? activityAt : broadAt >= 0 ? broadAt : 0,
    });
  }

  const byType = new Map<LocalDiscoveryResourceType, ConcurrentDiscoveryDomainHit>();
  for (const hit of hits) {
    const prior = byType.get(hit.resourceType);
    if (!prior || hit.mentionIndex < prior.mentionIndex) {
      byType.set(hit.resourceType, hit);
    }
  }

  return [...byType.values()].sort((a, b) => a.mentionIndex - b.mentionIndex);
}

export function concurrentDiscoveryResourceTypes(
  text: string,
): LocalDiscoveryResourceType[] {
  return detectConcurrentDiscoveryDomains(text).map((hit) => hit.resourceType);
}

/**
 * Two or more concrete domains in one utterance — multi-sector scout.
 * No fixed pair / sector-count limit.
 */
export function hasConcurrentMultiDomainSearchCues(text: string): boolean {
  return detectConcurrentDiscoveryDomains(text).length >= 2;
}

/** @deprecated Prefer hasConcurrentMultiDomainSearchCues */
export function hasConcurrentLodgingAndEaterySearchCues(text: string): boolean {
  const types = new Set(concurrentDiscoveryResourceTypes(text));
  return types.has("hotel") && types.has("restaurant");
}
