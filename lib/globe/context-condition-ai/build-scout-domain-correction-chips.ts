/**
 * Scout feed gate — inline domain correction chips when results bleed.
 * Apology + one-chip fix > clever auto-retry (UX playbook #3).
 */

import { parseAmenityFocus } from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";
import type { LocalDiscoveryResourceType } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export type ScoutRecommendationKind = "lodging" | "eatery" | "activity" | "amenity";

export type ScoutDomainCorrectionAction = "keep_kind" | "strip_kind";

export type ScoutDomainCorrectionChipV1 = {
  readonly id: string;
  readonly labelKo: string;
  readonly action: ScoutDomainCorrectionAction;
  readonly kind: ScoutRecommendationKind;
};

const RESOURCE_TO_KIND: Record<LocalDiscoveryResourceType, ScoutRecommendationKind> = {
  hotel: "lodging",
  restaurant: "eatery",
  activity: "activity",
  amenity: "amenity",
};

const LODGING_RE =
  /숙소|호텔|호텔스|에어비앤비|airbnb|lodging|hotel|stay|accommodation/iu;
const EATERY_RE =
  /맛집|식당|음식|카페|밥|먹을|restaurant|eatery|food|cafe|dining/iu;

export function resolveIntendedScoutKind(input: {
  triggerMessage?: string | null;
  resourceTypes?: readonly LocalDiscoveryResourceType[] | null;
}): ScoutRecommendationKind | null {
  const types = input.resourceTypes ?? [];
  if (types.length === 1) {
    return RESOURCE_TO_KIND[types[0]!] ?? null;
  }
  if (types.length > 1) {
    return null;
  }
  const text = input.triggerMessage?.trim() ?? "";
  if (!text) {
    return null;
  }
  if (parseAmenityFocus(text)) {
    return "amenity";
  }
  if (LODGING_RE.test(text) && !EATERY_RE.test(text)) {
    return "lodging";
  }
  if (EATERY_RE.test(text) && !LODGING_RE.test(text)) {
    return "eatery";
  }
  return null;
}

export function listPresentScoutKinds(
  recommendations: readonly { kind: string }[],
): readonly ScoutRecommendationKind[] {
  const set = new Set<ScoutRecommendationKind>();
  for (const row of recommendations) {
    if (
      row.kind === "lodging" ||
      row.kind === "eatery" ||
      row.kind === "activity" ||
      row.kind === "amenity"
    ) {
      set.add(row.kind);
    }
  }
  return [...set];
}

function kindLabelKo(
  kind: ScoutRecommendationKind,
  triggerMessage?: string | null,
): string {
  if (kind === "amenity") {
    return parseAmenityFocus(triggerMessage ?? "") ?? "편의";
  }
  if (kind === "lodging") {
    return "숙소";
  }
  if (kind === "eatery") {
    return "맛집";
  }
  return "놀거리";
}

export function buildScoutDomainCorrectionChips(input: {
  triggerMessage?: string | null;
  resourceTypes?: readonly LocalDiscoveryResourceType[] | null;
  recommendations: readonly { kind: string }[];
  keepOnlyLabel: (focusLabel: string) => string;
  stripLabel: (focusLabel: string) => string;
}): readonly ScoutDomainCorrectionChipV1[] {
  const present = listPresentScoutKinds(input.recommendations);
  if (present.length <= 1) {
    return [];
  }
  const intended = resolveIntendedScoutKind({
    triggerMessage: input.triggerMessage,
    resourceTypes: input.resourceTypes,
  });
  const chips: ScoutDomainCorrectionChipV1[] = [];

  if (intended && present.includes(intended)) {
    chips.push({
      id: `keep_${intended}`,
      labelKo: input.keepOnlyLabel(kindLabelKo(intended, input.triggerMessage)),
      action: "keep_kind",
      kind: intended,
    });
  }

  for (const foreign of present) {
    if (intended && foreign === intended) {
      continue;
    }
    if (foreign === "lodging" || (intended && foreign !== intended)) {
      chips.push({
        id: `strip_${foreign}`,
        labelKo: input.stripLabel(kindLabelKo(foreign, input.triggerMessage)),
        action: "strip_kind",
        kind: foreign,
      });
    }
  }

  // Cap at 2 — apology + one primary fix, optional strip.
  return chips.slice(0, 2);
}
