/**
 * Near-scout gate — Resolve Reality Anchor then assert fail-closed (Slice A).
 * All domain scouts (lodging · eatery · poi · …) enter Scout only after this.
 */

import {
  assertSpatialAnchorResolved,
  isNearScoutUtterance,
  type AssertSpatialAnchorResolvedResult,
  type SpatialAnchorCandidateChip,
} from "@/lib/context-workspace/reality-anchor/assert-spatial-anchor-resolved";
import {
  extractNearPlaceLabelFromUtterance,
  resolveRealityAnchorFromUtterance,
  resolveRealityAnchorFromUtteranceAsync,
} from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";

export type GateNearScoutAnchorResult =
  | {
      readonly gated: false;
      /** Utterance is not a near-scout — caller may scout without Anchor. */
    }
  | ({
      readonly gated: true;
    } & AssertSpatialAnchorResolvedResult);

/**
 * Sync resolve + assert. Prefer async gate when Nominatim may help.
 */
export function gateNearScoutAnchor(input: {
  readonly utterance: string;
  readonly candidates?: readonly SpatialAnchorCandidateChip[];
}): GateNearScoutAnchorResult {
  const utterance = input.utterance.trim();
  if (!isNearScoutUtterance(utterance)) {
    return { gated: false };
  }
  const nearLabelKo = extractNearPlaceLabelFromUtterance(utterance);
  const anchor = resolveRealityAnchorFromUtterance(utterance);
  const asserted = assertSpatialAnchorResolved({
    hasNearConstraint: true,
    anchor,
    nearLabelKo,
    candidates: input.candidates,
  });
  return { gated: true, ...asserted };
}

export async function gateNearScoutAnchorAsync(input: {
  readonly utterance: string;
  readonly candidates?: readonly SpatialAnchorCandidateChip[];
}): Promise<GateNearScoutAnchorResult> {
  const utterance = input.utterance.trim();
  if (!isNearScoutUtterance(utterance)) {
    return { gated: false };
  }
  const nearLabelKo = extractNearPlaceLabelFromUtterance(utterance);
  const anchor = await resolveRealityAnchorFromUtteranceAsync(utterance);
  const asserted = assertSpatialAnchorResolved({
    hasNearConstraint: true,
    anchor,
    nearLabelKo,
    candidates: input.candidates,
  });
  return { gated: true, ...asserted };
}
