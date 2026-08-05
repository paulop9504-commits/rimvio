/**
 * FAIL UX — ANCHOR_NOT_FOUND / AMBIGUOUS → station chips (never invent map pins).
 */

import type { SpatialAnchorCandidateChip } from "@/lib/context-workspace/reality-anchor/assert-spatial-anchor-resolved";
import type { SpatialAnchorFailCode } from "@/lib/context-workspace/reality-anchor/assert-spatial-anchor-resolved";
import { extractNearPlaceLabelFromUtterance } from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";
import type { NetworkAbsorbSoftChip } from "@/lib/reality-provider/apply-network-absorb-workspace-turn";

/** Dock sentinel — focus composer; do not run Scout. */
export const ANCHOR_RETYPE_CHIP_UTTERANCE = "__anchor_retype__";

/** Well-known Osaka stations for NOT_FOUND re-pick (suggest only). */
const SUGGEST_STATIONS_KO = [
  "난바역",
  "모리노미아역",
  "텐노지역",
  "우메다역",
] as const;

export function rebuildNearScoutUtterance(input: {
  readonly utterance: string;
  readonly nearLabelKo: string;
}): string {
  const original = input.utterance.trim();
  const nextNear = input.nearLabelKo.trim();
  if (!original || !nextNear) return original;
  const oldNear = extractNearPlaceLabelFromUtterance(original);
  if (oldNear && oldNear !== nextNear) {
    return original.replace(oldNear, nextNear);
  }
  if (/근처|주변/u.test(original)) {
    return original;
  }
  if (/맛집|식당|카페|호텔|숙소|캡슐|놀거리|명소/u.test(original)) {
    return `${nextNear} 근처 ${original}`;
  }
  return `${nextNear} 근처 ${original}`;
}

/**
 * Soft chips for Anchor fail — pick a station or retype.
 * Does not populate Map/List.
 */
export function buildAnchorFailSoftChips(input: {
  readonly utterance: string;
  readonly code: SpatialAnchorFailCode;
  readonly nearLabelKo?: string | null;
  readonly candidates?: readonly SpatialAnchorCandidateChip[];
}): readonly NetworkAbsorbSoftChip[] {
  const utterance = input.utterance.trim();
  const fromGate = (input.candidates ?? [])
    .map((c) => c.labelKo.trim())
    .filter(Boolean)
    .slice(0, 3);

  const labels =
    fromGate.length > 0
      ? fromGate
      : input.code === "ANCHOR_NOT_FOUND" ||
          input.code === "ANCHOR_AMBIGUOUS" ||
          input.code === "ANCHOR_CITY_REJECTED"
        ? [...SUGGEST_STATIONS_KO]
        : [];

  const chips: NetworkAbsorbSoftChip[] = labels.map((labelKo) => ({
    labelKo,
    utterance: rebuildNearScoutUtterance({
      utterance,
      nearLabelKo: labelKo,
    }),
  }));

  chips.push({
    labelKo: "다시 입력",
    utterance: ANCHOR_RETYPE_CHIP_UTTERANCE,
  });

  return chips;
}

export function formatAnchorNotFoundStatusKo(
  nearLabelKo: string | null | undefined,
): string {
  const label = nearLabelKo?.trim() || "그곳";
  return `'${label}'을(를) 찾지 못했어요`;
}
