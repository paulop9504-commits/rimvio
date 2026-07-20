import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPinnedContextItem } from "@/lib/globe/context-pinned-item";
import { listRealityObjects } from "@/lib/reality-object/store";
import type { ProjectionTier } from "@/lib/visual-projection/types";

/**
 * Place IDs that belong to the active context workspace
 * (Reality Objects + primary pin) — foreground on the Globe.
 */
export function listContextProjectionPlaceIds(
  event: EventCandidate | null | undefined,
): ReadonlySet<string> {
  const ids = new Set<string>();
  if (!event) {
    return ids;
  }
  for (const object of listRealityObjects(event)) {
    const placeId =
      typeof object.metadata.placeId === "string"
        ? object.metadata.placeId.trim()
        : "";
    if (placeId) {
      ids.add(placeId);
    }
  }
  const pinned = readPinnedContextItem(event);
  if (pinned?.placeId?.trim()) {
    ids.add(pinned.placeId.trim());
  }
  return ids;
}

export function resolveProjectionTierForPlace(input: {
  placeId: string | null | undefined;
  contextPlaceIds: ReadonlySet<string>;
  /** When false, everything is foreground (discovery scout). */
  contextWorkspaceActive: boolean;
}): ProjectionTier {
  if (!input.contextWorkspaceActive || input.contextPlaceIds.size === 0) {
    return "foreground";
  }
  const placeId = input.placeId?.trim();
  if (!placeId) {
    return "background";
  }
  return input.contextPlaceIds.has(placeId) ? "foreground" : "background";
}

/**
 * Hierarchical projection — keep foreground; drop or keep background
 * depending on policy. Default: hide background (context workspace).
 */
export function filterMarkersByContextProjection<
  T extends { placeId?: string | null; resourceId?: string },
>(input: {
  markers: readonly T[];
  contextPlaceIds: ReadonlySet<string>;
  contextWorkspaceActive: boolean;
  keepBackground?: boolean;
  placeIdFromMarker?: (marker: T) => string | null;
}): T[] {
  if (!input.contextWorkspaceActive || input.contextPlaceIds.size === 0) {
    return [...input.markers];
  }
  const extract =
    input.placeIdFromMarker ??
    ((marker: T) => marker.placeId?.trim() || null);

  return input.markers.filter((marker) => {
    const placeId = extract(marker);
    const tier = resolveProjectionTierForPlace({
      placeId,
      contextPlaceIds: input.contextPlaceIds,
      contextWorkspaceActive: true,
    });
    if (tier === "foreground") {
      return true;
    }
    return input.keepBackground === true;
  });
}
