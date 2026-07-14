import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai";
import type { TripExperienceScoutLeg } from "@/lib/globe/trip-experience/build-trip-experience-parallel-scouts";

export type TripExperienceParallelScoutOutcomes = Partial<
  Record<TripExperienceScoutLeg, ContextConditionAnchorPinOutcome | null>
>;

/** Merge lodging · eatery · activity scout batches into one reel batch. */
export function mergeTripExperienceScoutOutcomes(
  legs: TripExperienceParallelScoutOutcomes,
): ContextConditionAnchorPinOutcome | null {
  const lodging = legs.lodging ?? null;
  const eatery = legs.eatery ?? null;
  const activity = legs.activity ?? null;
  const primary = lodging ?? eatery ?? activity;
  if (!primary) {
    return null;
  }

  const recommendations = [
    ...(lodging?.recommendations ?? []),
    ...(eatery?.recommendations ?? []),
    ...(activity?.recommendations ?? []),
  ];
  const lodgingCount = lodging?.lodgingCount ?? 0;
  const eateryCount = eatery?.eateryCount ?? 0;
  const pinPoints = [
    ...(lodging?.pinPoints ?? []),
    ...(eatery?.pinPoints ?? []),
    ...(activity?.pinPoints ?? []),
  ];

  const parts: string[] = [];
  if (lodgingCount > 0) {
    parts.push(`숙소 ${lodgingCount}`);
  }
  if (eateryCount > 0) {
    parts.push(`맛집 ${eateryCount}`);
  }
  const activityCount = activity?.recommendations.length ?? 0;
  if (activityCount > 0) {
    parts.push(`놀거리 ${activityCount}`);
  }

  const summaryKo =
    parts.length > 0
      ? `${parts.join(" · ")} — 재미 여행 후보를 지도에 띄웠어요`
      : primary.summaryKo;

  const batchSuffix = [
    lodging?.batchId,
    eatery?.batchId,
    activity?.batchId,
  ]
    .filter(Boolean)
    .join("-");

  return {
    ...primary,
    batchId: batchSuffix ? `trip-xp-${batchSuffix}` : `trip-xp-${primary.batchId}`,
    lodgingCount,
    eateryCount,
    recommendations,
    pinPoints,
    summaryKo,
    radiusM: Math.max(
      lodging?.radiusM ?? 0,
      eatery?.radiusM ?? 0,
      activity?.radiusM ?? 0,
    ),
    spec: lodging?.spec ?? eatery?.spec ?? activity!.spec,
  };
}
