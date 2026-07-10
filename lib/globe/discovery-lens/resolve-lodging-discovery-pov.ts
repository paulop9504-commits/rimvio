import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { readPinnedContextItem } from "@/lib/globe/context-pinned-item";
import { DISCOVERY_LENS_DEFAULT_RADIUS_M } from "@/lib/globe/discovery-lens/constants";
import type { DiscoverySearchOrigin } from "@/lib/globe/discovery-lens/types";
import { readContextSpatialTargetFromEvent } from "@/lib/globe/spatial/write-context-spatial-target-from-text";
import { readPalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";

function lodgingRowFromBatch(
  contextEventId: string,
): {
  title: string;
  placeId?: string;
  lat: number;
  lng: number;
} | null {
  const batch = readContextConditionLastBatch(contextEventId);
  const rows = batch?.recommendations ?? [];
  if (rows.length === 0) {
    return null;
  }
  const primaryPlaceId = readPalantirWorkspaceSnapshot(contextEventId)?.primaryPlaceId;
  const primary =
  primaryPlaceId != null
    ? rows.find(
        (row) =>
          row.kind === "lodging" &&
          row.placeId === primaryPlaceId &&
          row.lat != null &&
          row.lng != null,
      )
    : null;
  const lodging =
    primary ??
    rows.find((row) => row.kind === "lodging" && row.lat != null && row.lng != null);
  if (!lodging || lodging.lat == null || lodging.lng == null) {
    return null;
  }
  return {
    title: lodging.title,
    placeId: lodging.placeId,
    lat: lodging.lat,
    lng: lodging.lng,
  };
}

/** Hotel / pinned lodging POV when scout anchor is not set yet. */
export function resolveLodgingDiscoveryPov(
  contextEventId: string,
): DiscoverySearchOrigin | null {
  const key = contextEventId.trim();
  if (!key) {
    return null;
  }
  const event = findLifeEventCandidate(key);
  const spatialTarget = readContextSpatialTargetFromEvent(event);
  if (spatialTarget) {
    return {
      lat: spatialTarget.lat,
      lng: spatialTarget.lng,
      regionLabel: spatialTarget.label,
      radiusM: DISCOVERY_LENS_DEFAULT_RADIUS_M,
      lensId: null,
    };
  }
  const pinned = readPinnedContextItem(event);
  if (
    pinned?.kind === "lodging" &&
    pinned.lat != null &&
    pinned.lng != null &&
    Number.isFinite(pinned.lat) &&
    Number.isFinite(pinned.lng)
  ) {
    return {
      lat: pinned.lat,
      lng: pinned.lng,
      regionLabel: pinned.label,
      radiusM: DISCOVERY_LENS_DEFAULT_RADIUS_M,
      lensId: null,
    };
  }
  const fromBatch = lodgingRowFromBatch(key);
  if (!fromBatch) {
    return null;
  }
  return {
    lat: fromBatch.lat,
    lng: fromBatch.lng,
    regionLabel: fromBatch.title,
    radiusM: DISCOVERY_LENS_DEFAULT_RADIUS_M,
    lensId: null,
  };
}
