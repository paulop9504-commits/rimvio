import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { DISCOVERY_LENS_DEFAULT_RADIUS_M } from "@/lib/globe/discovery-lens/constants";
import type { DiscoverySearchOrigin } from "@/lib/globe/discovery-lens/types";
import {
  discoveryOriginFromLens,
  readActiveDiscoveryLens,
} from "@/lib/globe/discovery-lens/types";
import { readDiscoveryLensSession } from "@/lib/globe/discovery-lens/lens-session-bridge";
import { resolveLodgingDiscoveryPov } from "@/lib/globe/discovery-lens/resolve-lodging-discovery-pov";
import type { LocalDiscoveryQuestionChoice } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { extractLandmarkHintsFromChoice } from "@/lib/globe/discovery-lens/extract-landmark-hints";
import {
  spawnDiscoveryLensAtCoords,
  spawnDiscoveryLenses,
} from "@/lib/globe/discovery-lens/spawn-discovery-lenses";
import {
  readScoutContract,
  readScoutSelectedAnchor,
  writeScoutSelectedAnchor,
} from "@/lib/globe/contracts";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";

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
    const radiusM = contract?.lens.radiusM ?? DISCOVERY_LENS_DEFAULT_RADIUS_M;
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
  if (active) {
    return discoveryOriginFromLens(active);
  }
  return resolveLodgingDiscoveryPov(contextEventId);
}

export function ensureScoutAnchorFromDiscoveryPov(
  contextEventId: string,
  pov: DiscoverySearchOrigin,
): void {
  const existing = readScoutSelectedAnchor(contextEventId);
  if (existing) {
    return;
  }
  const batch = readContextConditionLastBatch(contextEventId);
  writeScoutSelectedAnchor(contextEventId, {
    scoutId: batch?.batchId?.trim() || `pov:${contextEventId}`,
    placeId: `pov:${pov.lat},${pov.lng}`,
    lat: pov.lat,
    lng: pov.lng,
    title: pov.regionLabel,
  });
}

export function ensureNeighborhoodLensForActivityScout(
  contextEventId: string,
  pov: DiscoverySearchOrigin,
): void {
  spawnDiscoveryLensAtCoords({
    contextEventId,
    labelKo: pov.regionLabel,
    lat: pov.lat,
    lng: pov.lng,
    radiusM: pov.radiusM,
    spawnedFrom: "근처",
  });
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
  return hasLodgingDomainCue(text);
}

export function isEateryDiscoveryMessage(text: string): boolean {
  return hasEateryDomainCue(text);
}
