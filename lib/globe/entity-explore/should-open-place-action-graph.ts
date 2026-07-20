/**
 * Which Brain Surface markers open Place Action Graph (vs video peek / resource reel).
 */

import type { PlaceExploreContextBias } from "@/lib/globe/entity-explore/build-place-explore-graph";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

export function shouldOpenPlaceActionGraph(
  candidate: BrainSurfaceProjectionCandidate,
): boolean {
  if (candidate.anchorKind === "video_root" || candidate.family === "media") {
    return false;
  }
  // Explore children + inferred dashed places — Action Graph primary.
  if (
    candidate.markerStyle === "dashed" ||
    candidate.anchorKind === "inferred_place"
  ) {
    return true;
  }
  if (
    candidate.family === "trace_place" ||
    candidate.family === "info" ||
    candidate.family === "event" ||
    candidate.family === "memo"
  ) {
    return true;
  }
  // Lodging / eatery inventory cards stay on resource reel path.
  return false;
}

export function resolvePlaceExploreBias(input: {
  contextTitle?: string | null;
  contextPlace?: string | null;
  candidates?: readonly BrainSurfaceProjectionCandidate[];
}): PlaceExploreContextBias {
  const blob = `${input.contextTitle ?? ""} ${input.contextPlace ?? ""}`;
  const tripKind = /커플|연인|아내|남편|데이트|couple|honeymoon/iu.test(blob)
    ? ("couple" as const)
    : /가족|아이|kids|family/iu.test(blob)
      ? ("family" as const)
      : /혼자|solo/iu.test(blob)
        ? ("solo" as const)
        : null;
  const lodgingMissing = !(input.candidates ?? []).some(
    (row) => row.family === "lodging" && row.markerStyle !== "dashed",
  );
  const foodBias = /맛집|식사|저녁|점심|카페|food|dinner|lunch/iu.test(blob);
  const cherrySeason = /벚꽃|cherry|sakura/iu.test(blob);
  return {
    tripKind,
    lodgingMissing,
    foodBias,
    cherrySeason,
  };
}
