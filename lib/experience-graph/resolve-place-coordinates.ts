import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { matchKoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";

export type PlaceCoordinates = {
  lat: number;
  lng: number;
  label: string;
};

const DEFAULT_COORDS: PlaceCoordinates = {
  lat: 36.5,
  lng: 127.8,
  label: "한국",
};

/** Pure read — place label → approximate coordinates for globe stage. */
export function resolvePlaceCoordinates(placeLabel: string): PlaceCoordinates {
  const hay = normalizePlaceLabel(placeLabel);
  if (!hay) {
    return DEFAULT_COORDS;
  }

  const overseas = classifyOverseasManualPlace(hay);
  if (overseas) {
    return { lat: overseas.lat, lng: overseas.lng, label: overseas.label };
  }

  const known = matchKoreaKnownPlace(hay);
  if (known) {
    return { lat: known.lat, lng: known.lng, label: known.label };
  }

  return { ...DEFAULT_COORDS, label: hay };
}

/** Map lat/lng to 0–100 pin on flat equirectangular projection. */
export function projectLatLngToMapPercent(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

/** Inverse of projectLatLngToMapPercent — tap on flat globe map. */
export function mapPercentToLatLng(pinX: number, pinY: number): {
  lat: number;
  lng: number;
} {
  const x = Math.min(100, Math.max(0, pinX));
  const y = Math.min(100, Math.max(0, pinY));
  return {
    lng: (x / 100) * 360 - 180,
    lat: 90 - (y / 100) * 180,
  };
}

export function buildSpatialGlobeView(input: {
  lat: number;
  lng: number;
  placeLabel: string;
  zoom?: number;
}): import("@/lib/experience-graph/spatial-media-types").SpatialGlobeView {
  const pin = projectLatLngToMapPercent(input.lat, input.lng);
  return {
    lat: input.lat,
    lng: input.lng,
    pinX: pin.x,
    pinY: pin.y,
    zoom: input.zoom ?? 1.65,
    placeLabel: input.placeLabel,
  };
}
