import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/run-context-condition-anchor-pin";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  buildScoutDomainCorrectionChips,
  type ScoutDomainCorrectionChipV1,
} from "@/lib/globe/context-condition-ai/build-scout-domain-correction-chips";
import type { PlaceReviewKind } from "@/lib/globe/place-review-video";
import { copy } from "@/lib/copy/human-ko";

export type ScoutFeedGateVideoContext = {
  readonly name: string;
  readonly place: string;
  readonly kind: PlaceReviewKind;
  readonly lat: number;
  readonly lng: number;
};

export type ScoutFeedGateEnrichment = {
  readonly scoutKind: "lodging" | "eatery" | "activity" | "amenity" | "mixed";
  readonly aiInsightKo: string;
  readonly tipsKo: readonly string[];
  readonly highlightTitles: readonly string[];
  readonly videoContext: ScoutFeedGateVideoContext | null;
  readonly correctionChips: readonly ScoutDomainCorrectionChipV1[];
};

function dominantScoutKind(
  recommendations: readonly ContextConditionRecommendation[],
): ScoutFeedGateEnrichment["scoutKind"] {
  const counts = new Map<string, number>();
  for (const row of recommendations) {
    counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
  }
  const kinds = [...counts.keys()];
  if (kinds.length > 1) {
    return "mixed";
  }
  const only = kinds[0];
  if (
    only === "lodging" ||
    only === "eatery" ||
    only === "activity" ||
    only === "amenity"
  ) {
    return only;
  }
  return "mixed";
}

function reviewKindForScout(
  scoutKind: ScoutFeedGateEnrichment["scoutKind"],
): PlaceReviewKind {
  if (scoutKind === "lodging") {
    return "lodging";
  }
  if (scoutKind === "eatery") {
    return "eatery";
  }
  return "place";
}

function buildAiInsightKo(input: {
  scoutKind: ScoutFeedGateEnrichment["scoutKind"];
  areaLabel: string;
  recommendations: readonly ContextConditionRecommendation[];
}): string {
  const top = [...input.recommendations].sort((a, b) => a.rank - b.rank).slice(0, 3);
  const titles = top.map((row) => row.title.trim()).filter(Boolean);
  const leadReason = top[0]?.reasonKo?.trim() ?? "";
  return copy.globe.scoutFeedGateAiInsight({
    scoutKind: input.scoutKind,
    areaLabel: input.areaLabel,
    titles,
    leadReason,
  });
}

function buildTipsKo(input: {
  scoutKind: ScoutFeedGateEnrichment["scoutKind"];
  areaLabel: string;
  triggerMessage?: string | null;
}): string[] {
  const tips = copy.globe.scoutFeedGateTips({
    scoutKind: input.scoutKind,
    areaLabel: input.areaLabel,
    triggerMessage: input.triggerMessage ?? "",
  })
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean);
  return tips.slice(0, 3);
}

/** Deterministic scout gate copy — videos load client-side from `videoContext`. */
export function buildScoutFeedGateEnrichment(input: {
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  triggerMessage?: string | null;
  outcome: Pick<ContextConditionAnchorPinOutcome, "recommendations" | "spec">;
}): ScoutFeedGateEnrichment {
  const areaLabel = input.anchorPlaceName.trim() || copy.globe.scoutFeedGateAreaFallback;
  const recommendations = input.outcome.recommendations;
  const scoutKind = dominantScoutKind(recommendations);
  const sorted = [...recommendations].sort((a, b) => a.rank - b.rank);
  const highlightTitles = sorted
    .slice(0, 3)
    .map((row) => row.title.trim())
    .filter(Boolean);
  const top = sorted[0];
  const videoContext: ScoutFeedGateVideoContext | null = top
    ? {
        name:
          scoutKind === "activity" || scoutKind === "mixed"
            ? copy.globe.scoutFeedGateVideoQuery(areaLabel)
            : top.title.trim(),
        place: areaLabel,
        kind: reviewKindForScout(scoutKind),
        lat: top.lat,
        lng: top.lng,
      }
    : null;

  return {
    scoutKind,
    aiInsightKo: buildAiInsightKo({ scoutKind, areaLabel, recommendations }),
    tipsKo: buildTipsKo({
      scoutKind,
      areaLabel,
      triggerMessage: input.triggerMessage,
    }),
    highlightTitles,
    videoContext,
    correctionChips: buildScoutDomainCorrectionChips({
      triggerMessage: input.triggerMessage,
      resourceTypes: input.outcome.spec?.resourceTypes,
      recommendations,
      keepOnlyLabel: copy.globe.scoutFeedGateCorrectionKeepOnly,
      stripLabel: copy.globe.scoutFeedGateCorrectionStrip,
    }),
  };
}
