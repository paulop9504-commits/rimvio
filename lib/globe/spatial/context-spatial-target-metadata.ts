export const CONTEXT_SPATIAL_TARGET_LABEL_META_KEY = "contextSpatialTargetLabel";
export const CONTEXT_SPATIAL_TARGET_LAT_META_KEY = "contextSpatialTargetLat";
export const CONTEXT_SPATIAL_TARGET_LNG_META_KEY = "contextSpatialTargetLng";
export const CONTEXT_SPATIAL_TARGET_QUERY_META_KEY = "contextSpatialTargetQuery";

export type ContextSpatialTargetWire = {
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
  readonly query: string;
};

export function readContextSpatialTarget(
  metadata: Record<string, unknown> | null | undefined,
): ContextSpatialTargetWire | null {
  const meta = metadata ?? {};
  const label =
    typeof meta[CONTEXT_SPATIAL_TARGET_LABEL_META_KEY] === "string"
      ? meta[CONTEXT_SPATIAL_TARGET_LABEL_META_KEY].trim()
      : "";
  const lat = meta[CONTEXT_SPATIAL_TARGET_LAT_META_KEY];
  const lng = meta[CONTEXT_SPATIAL_TARGET_LNG_META_KEY];
  if (
    !label ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  const query =
    typeof meta[CONTEXT_SPATIAL_TARGET_QUERY_META_KEY] === "string"
      ? meta[CONTEXT_SPATIAL_TARGET_QUERY_META_KEY].trim()
      : label;
  return { label, lat, lng, query };
}

export function stampContextSpatialTargetMetadata(
  base: Record<string, unknown> | undefined,
  target: ContextSpatialTargetWire,
): Record<string, unknown> {
  return {
    ...(base ?? {}),
    [CONTEXT_SPATIAL_TARGET_LABEL_META_KEY]: target.label,
    [CONTEXT_SPATIAL_TARGET_LAT_META_KEY]: target.lat,
    [CONTEXT_SPATIAL_TARGET_LNG_META_KEY]: target.lng,
    [CONTEXT_SPATIAL_TARGET_QUERY_META_KEY]: target.query,
  };
}
