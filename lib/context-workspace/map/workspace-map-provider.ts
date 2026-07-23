/**
 * Workspace 2D map provider — MapLibre default (sharp street zoom).
 * Apple MapKit optional. No 3D↔2D hybrid on the Globe.
 */

export type WorkspaceMapProviderId =
  | "maplibre"
  | "apple_mapkit"
  | "placeholder";

export type WorkspaceMapPin = {
  readonly id: string;
  readonly title: string;
  readonly lat: number;
  readonly lng: number;
  readonly rating?: number | null;
  readonly selected?: boolean;
};

export type WorkspaceMapCamera = {
  readonly centerLat: number;
  readonly centerLng: number;
  readonly spanLat?: number;
  readonly spanLng?: number;
};

/** Resolve active 2D Workspace map engine. Default = MapLibre. */
export function resolveWorkspaceMapProvider(): WorkspaceMapProviderId {
  if (typeof process === "undefined") {
    return "maplibre";
  }
  const forced = process.env.NEXT_PUBLIC_WORKSPACE_MAP_PROVIDER?.trim();
  if (
    forced === "apple_mapkit" ||
    forced === "placeholder" ||
    forced === "maplibre"
  ) {
    return forced;
  }
  if (
    process.env.NEXT_PUBLIC_APPLE_MAPKIT_ENABLED === "1" ||
    process.env.NEXT_PUBLIC_APPLE_MAPKIT_ENABLED === "true"
  ) {
    return "apple_mapkit";
  }
  return "maplibre";
}

export function isAppleMapKitWorkspaceEnabled(): boolean {
  return resolveWorkspaceMapProvider() === "apple_mapkit";
}

export function isMapLibreWorkspaceEnabled(): boolean {
  return resolveWorkspaceMapProvider() === "maplibre";
}
