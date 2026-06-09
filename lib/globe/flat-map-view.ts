import {
  clampGlobeLatitude,
  latLngToMercatorPixel,
} from "@/lib/experience-graph/reproject-mercator-to-equirectangular";

const TILE_SIZE = 256;

export type FlatMapView = {
  lat: number;
  lng: number;
  /** UI zoom knob — maps to slippy z11–z20. */
  zoom: number;
};

export const FLAT_MAP_ZOOM_MIN = 1.25;
export const FLAT_MAP_ZOOM_MAX = 4.25;
/** Pinch out below this hands control back to the 3D globe. */
export const FLAT_MAP_EXIT_ZOOM = 1.42;

export function clampFlatMapZoom(zoom: number): number {
  return Math.min(FLAT_MAP_ZOOM_MAX, Math.max(FLAT_MAP_ZOOM_MIN, zoom));
}

export function resolveFlatMapSlippyZoom(viewZoom: number): number {
  return Math.min(20, Math.max(11, Math.round(9 + viewZoom * 2.6)));
}

/** Seed flat view when handing off from globe.gl altitude. */
export function flatMapZoomFromGlobeAltitude(altitude: number): number {
  const safe = Math.max(0.001, altitude);
  return clampFlatMapZoom(2.75 - Math.log10(safe) * 0.82);
}

export function mercatorPixelToLatLng(
  x: number,
  y: number,
  slippyZoom: number,
  tileSize = TILE_SIZE,
): { lat: number; lng: number } {
  const n = 2 ** slippyZoom;
  const lng = (x / (n * tileSize)) * 360 - 180;
  const t = Math.PI * (1 - (2 * y) / (n * tileSize));
  const latRad = Math.atan(Math.sinh(t));
  return {
    lat: clampGlobeLatitude((latRad * 180) / Math.PI),
    lng,
  };
}

export function panFlatMapView(
  view: FlatMapView,
  deltaXPx: number,
  deltaYPx: number,
): FlatMapView {
  const slippyZoom = resolveFlatMapSlippyZoom(view.zoom);
  const center = latLngToMercatorPixel(view.lat, view.lng, slippyZoom);
  const next = mercatorPixelToLatLng(
    center.x - deltaXPx,
    center.y - deltaYPx,
    slippyZoom,
  );
  return { ...view, lat: next.lat, lng: next.lng };
}

export function zoomFlatMapView(view: FlatMapView, factor: number): FlatMapView {
  return { ...view, zoom: clampFlatMapZoom(view.zoom * factor) };
}

export function zoomFlatMapFromPinch(
  view: FlatMapView,
  startZoom: number,
  startDistance: number,
  currentDistance: number,
): FlatMapView {
  if (startDistance <= 0 || currentDistance <= 0) {
    return view;
  }
  return { ...view, zoom: clampFlatMapZoom(startZoom * (currentDistance / startDistance)) };
}

export function projectFlatMapPinOffset(
  view: FlatMapView,
  pinLat: number,
  pinLng: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  const slippyZoom = resolveFlatMapSlippyZoom(view.zoom);
  const center = latLngToMercatorPixel(view.lat, view.lng, slippyZoom);
  const pin = latLngToMercatorPixel(pinLat, pinLng, slippyZoom);
  return {
    x: viewportWidth / 2 + (pin.x - center.x),
    y: viewportHeight / 2 + (pin.y - center.y),
  };
}

export function shouldExitFlatMapToGlobe3d(zoom: number): boolean {
  return zoom <= FLAT_MAP_EXIT_ZOOM;
}
