/**
 * Infer Workspace search domain from utterance — continuous multi-intent (Cursor-like).
 * Do not lock forever to the first hotel open.
 */

import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { resolveLocalDiscoveryDomain } from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";
import { isSameProjectReSearchUtterance } from "@/lib/graph-command/is-same-project-re-search";
import { isAmenityLookupQuery } from "@/lib/tool-registry/amenity-lookup-cue";
import { isBrowseExtractQuery } from "@/lib/tool-registry/browse-extract";
import type { ContextWorkspaceDomain } from "@/lib/context-workspace/types";

const LODGING_RE =
  /호텔|숙소|모텔|게스트하우스|캡슐|hotel|stay|lodging|ryokan|료칸/iu;
const EATERY_RE =
  /맛집|식당|카페|음식|밥집|먹을|먹거리|restaurant|cafe|food|eatery/iu;

/**
 * Active search domain for this Workspace turn.
 * Same-project 「다시 찾아」 keeps session; explicit cues switch domain.
 */
export function resolveWorkspaceSearchDomain(
  utterance: string,
  sessionDomain: ContextWorkspaceDomain,
): ContextWorkspaceDomain {
  const text = utterance.trim();
  if (!text) {
    return sessionDomain;
  }
  if (isSameProjectReSearchUtterance(text)) {
    return sessionDomain;
  }

  const discovery = resolveLocalDiscoveryDomain(text);
  if (discovery === "activity") {
    return "poi";
  }
  if (discovery === "amenity" || isAmenityLookupQuery(text)) {
    return "amenity";
  }

  if (hasLodgingDomainCue(text) || LODGING_RE.test(text)) {
    return "lodging";
  }
  if (hasEateryDomainCue(text) || EATERY_RE.test(text)) {
    return "eatery";
  }

  if (
    isBrowseExtractQuery(text) ||
    /관광|명소|테마\s*파크|액티비티|입장권|티켓|스튜디오|유니버설|놀거리|할거리|볼거리/iu.test(
      text,
    )
  ) {
    return "poi";
  }

  // Soft refine without domain cue — stay on current Workspace domain.
  return sessionDomain;
}

export function workspaceDomainToToolDomain(
  domain: ContextWorkspaceDomain,
): "lodging" | "eatery" | "poi" | "amenity" {
  if (domain === "lodging" || domain === "eatery" || domain === "amenity") {
    return domain;
  }
  return "poi";
}
