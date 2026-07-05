/**
 * Bridge path leg coordinates for globe arc projection.
 * Reality Surface only — not Blueprint wire.
 */

import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";

const ICN_COORDS = { lat: 37.4602, lng: 126.4407 };
const SEOUL_FALLBACK = { lat: 37.5665, lng: 126.978 };

export type BridgeLegCoord = {
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
};

function resolveAirportCoord(label: string): BridgeLegCoord | null {
  const hay = label.toLowerCase();
  if (hay.includes("인천") || hay === "공항") {
    return { label, ...ICN_COORDS };
  }
  if (hay.includes("간사이") || hay.includes("kansai")) {
    return { label, lat: 34.4347, lng: 135.2441 };
  }
  if (hay.includes("하네다") || hay.includes("haneda")) {
    return { label, lat: 35.5494, lng: 139.7798 };
  }
  if (hay.includes("후쿠오카") && hay.includes("공항")) {
    return { label, lat: 33.5859, lng: 130.451 };
  }
  return null;
}

/** Map bridge path label → coordinate for great-circle arc. */
export function resolveBridgeLegCoord(input: {
  label: string;
  userLat?: number | null;
  userLng?: number | null;
  destinationLabel?: string | null;
}): BridgeLegCoord | null {
  const label = input.label.trim();
  if (!label) {
    return null;
  }

  if (label === "집") {
    if (input.userLat != null && input.userLng != null) {
      return { label, lat: input.userLat, lng: input.userLng };
    }
    return { label, ...SEOUL_FALLBACK };
  }

  const airport = resolveAirportCoord(label);
  if (airport) {
    return airport;
  }

  if (label === "호텔" && input.destinationLabel) {
    const dest = resolveTripContextAnchor(input.destinationLabel);
    if (dest) {
      return {
        label,
        lat: dest.lat + 0.012,
        lng: dest.lng + 0.008,
      };
    }
  }

  const anchor = resolveTripContextAnchor(label);
  if (anchor) {
    return { label, lat: anchor.lat, lng: anchor.lng };
  }

  return null;
}

export function resolveBridgePathCoords(input: {
  pathLabels: readonly string[];
  userLat?: number | null;
  userLng?: number | null;
}): BridgeLegCoord[] {
  const destinationLabel =
    input.pathLabels.find(
      (label) => label !== "집" && label !== "공항" && label !== "호텔",
    ) ?? null;

  const coords: BridgeLegCoord[] = [];
  for (const label of input.pathLabels) {
    const row = resolveBridgeLegCoord({
      label,
      userLat: input.userLat,
      userLng: input.userLng,
      destinationLabel,
    });
    if (row) {
      coords.push(row);
    }
  }
  return coords;
}
