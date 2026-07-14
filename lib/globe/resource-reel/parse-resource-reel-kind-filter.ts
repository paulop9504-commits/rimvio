import type { GlobeResourceReelKind } from "@/lib/globe/resource-reel/types";
import type { ResourceReelKindFilter } from "@/lib/globe/resource-reel/resource-reel-kind-filter";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";

const FILTER_CUE =
  /(?:만|only|필터|골라\s*서\s*보|으로\s*만|로\s*만|만\s*보|만\s*볼)/iu;

function matchKind(text: string): GlobeResourceReelKind | "all" | null {
  if (
    /^(?:전체|모두)(?:로)?(?:\s*보여(?:줘)?|\s*볼)?$/iu.test(text.trim()) ||
    /다시\s*전체|전체\s*후보/iu.test(text)
  ) {
    return "all";
  }
  if (/전체|모두|다\s*보|all\b/iu.test(text)) {
    return "all";
  }
  if (hasEateryDomainCue(text)) {
    return "eatery";
  }
  if (hasLodgingDomainCue(text)) {
    return "lodging";
  }
  if (
    /놀거리|활동|관광|놀\s|activity|attraction|things?\s*to\s*do/iu.test(text)
  ) {
    return "activity";
  }
  if (/편의|약국|mart|amenity|pharmacy|convenience/iu.test(text)) {
    return "amenity";
  }
  return null;
}

/**
 * NL → reel kind filter.
 * Only narrow/show cues (e.g. 맛집만, 전체로 보여줘) — bare 「맛집」 must scout,
 * not re-filter trip inventory into a false “filtered” reply.
 */
export function parseResourceReelKindFilter(
  text: string,
): ResourceReelKindFilter | null {
  const raw = text.trim();
  if (!raw || raw.length > 48) {
    return null;
  }
  if (/렌즈|반경\s*\d/iu.test(raw)) {
    return null;
  }
  if (
    /^(?:전체|모두)(?:로)?(?:\s*보여(?:줘)?|\s*볼)?$/iu.test(raw) ||
    /다시\s*전체|전체\s*후보|전체로\s*보여/iu.test(raw)
  ) {
    return "all";
  }
  // Require an explicit narrow cue. Bare domain words go to discovery scout.
  if (!FILTER_CUE.test(raw)) {
    return null;
  }
  const kind = matchKind(raw);
  if (!kind || kind === "all") {
    return null;
  }
  return kind;
}
