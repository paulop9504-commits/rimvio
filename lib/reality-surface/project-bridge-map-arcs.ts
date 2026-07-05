/**
 * Project Reality Surface bridge path onto globe great-circle arcs.
 */

import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import { resolveBridgePathCoords } from "@/lib/reality-surface/resolve-bridge-leg-coords";
import type { RealitySurfaceProjectionBundle } from "@/lib/reality-surface/types";

export function projectBridgeMapArcs(input: {
  eventId: string;
  projection: RealitySurfaceProjectionBundle | null;
  userLat?: number | null;
  userLng?: number | null;
}): GlobeTripArc[] {
  const pathLabels = input.projection?.bridge?.pathLabels ?? [];
  if (pathLabels.length < 2) {
    return [];
  }

  const coords = resolveBridgePathCoords({
    pathLabels,
    userLat: input.userLat,
    userLng: input.userLng,
  });
  if (coords.length < 2) {
    return [];
  }

  const activeLegIndex = input.projection?.bridge?.activeLegIndex ?? 0;
  const arcs: GlobeTripArc[] = [];

  for (let index = 0; index < coords.length - 1; index += 1) {
    const from = coords[index]!;
    const to = coords[index + 1]!;
    const isPast = index < activeLegIndex;
    const isActive = index === activeLegIndex;

    arcs.push({
      id: `bridge-arc:${input.eventId}:${index}`,
      tripRef: input.eventId,
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
      color: isPast
        ? "#c4cad3"
        : isActive
          ? GLOBE_TOSS_THEME.blueDeep
          : GLOBE_TOSS_THEME.blue,
      emphasis: isActive ? "focused" : "default",
    });
  }

  return arcs;
}
