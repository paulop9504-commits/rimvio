import type { DiscoverySearchOrigin } from "@/lib/globe/discovery-lens/types";
import {
  discoveryOriginFromLens,
  readActiveDiscoveryLens,
} from "@/lib/globe/discovery-lens/types";
import { readDiscoveryLensSession } from "@/lib/globe/discovery-lens/lens-session-bridge";
import type { LocalDiscoveryQuestionChoice } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { extractLandmarkHintsFromChoice } from "@/lib/globe/discovery-lens/extract-landmark-hints";
import { spawnDiscoveryLenses } from "@/lib/globe/discovery-lens/spawn-discovery-lenses";
import {
  readScoutContract,
  readScoutSelectedAnchor,
} from "@/lib/globe/contracts";

export function resolveDiscoveryOriginForContext(
  contextEventId: string,
): DiscoverySearchOrigin | null {
  const contract = readScoutContract(contextEventId);
  const anchor = contract?.lens.anchorRef;
  if (
    anchor &&
    Number.isFinite(anchor.lat) &&
    Number.isFinite(anchor.lng) &&
    contract
  ) {
    return {
      lat: anchor.lat,
      lng: anchor.lng,
      regionLabel: anchor.title?.trim() || contract.category,
      radiusM: contract.lens.radiusM,
      lensId: contract.lens.lensId ?? null,
    };
  }
  const selected = readScoutSelectedAnchor(contextEventId);
  if (selected && Number.isFinite(selected.lat) && Number.isFinite(selected.lng)) {
    const radiusM = contract?.lens.radiusM ?? 1500;
    return {
      lat: selected.lat,
      lng: selected.lng,
      regionLabel: selected.title?.trim() || selected.placeId,
      radiusM,
      lensId: contract?.lens.lensId ?? null,
    };
  }
  const session = readDiscoveryLensSession(contextEventId);
  const active = readActiveDiscoveryLens(session);
  if (!active) {
    return null;
  }
  return discoveryOriginFromLens(active);
}

export async function maybeSpawnDiscoveryLensesFromChoice(input: {
  contextEventId: string;
  choice: LocalDiscoveryQuestionChoice;
  region?: string | null;
  hintLat?: number | null;
  hintLng?: number | null;
}) {
  const landmarksFromChoice = extractLandmarkHintsFromChoice({
    label: input.choice.label,
    value: input.choice.value,
    landmarks: input.choice.landmarks,
  });
  const landmarks =
    landmarksFromChoice.length >= 2
      ? landmarksFromChoice
      : (input.choice.cluster ?? [])
          .map((node) => node.trim())
          .filter((node) => node.length >= 2)
          .slice(0, 3);
  if (landmarks.length < 1) {
    return null;
  }
  return spawnDiscoveryLenses({
    contextEventId: input.contextEventId,
    region: input.region,
    landmarks,
    spawnedFrom: input.choice.label,
    hintLat: input.hintLat,
    hintLng: input.hintLng,
  });
}

export function isLodgingDiscoveryMessage(text: string): boolean {
  return /숙소|호텔|숙박|lodging|hotel|stay/iu.test(text.trim());
}

export function isEateryDiscoveryMessage(text: string): boolean {
  return /맛집|식당|카페|커피|먹|restaurant|cafe|food/iu.test(text.trim());
}
