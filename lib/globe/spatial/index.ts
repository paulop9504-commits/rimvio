export {
  CONTEXT_SPATIAL_TARGET_LABEL_META_KEY,
  CONTEXT_SPATIAL_TARGET_LAT_META_KEY,
  CONTEXT_SPATIAL_TARGET_LNG_META_KEY,
  CONTEXT_SPATIAL_TARGET_QUERY_META_KEY,
  readContextSpatialTarget,
  stampContextSpatialTargetMetadata,
  type ContextSpatialTargetWire,
} from "@/lib/globe/spatial/context-spatial-target-metadata";
export {
  normalizeSpatialSideCue,
  resolveSpatialTargetFromText,
  type SpatialTargetFromText,
} from "@/lib/globe/spatial/resolve-spatial-target-from-text";
export {
  readContextSpatialTargetFromEvent,
  writeContextSpatialTargetFromText,
} from "@/lib/globe/spatial/write-context-spatial-target-from-text";
