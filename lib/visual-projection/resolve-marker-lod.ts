import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import type {
  ProjectionTier,
  ResolveMarkerLodInput,
  VisualProjectionLod,
} from "@/lib/visual-projection/types";

/**
 * Zoom LOD for Reality Objects on the Globe.
 * Far → glyph · mid → glyph+label · near → cover image.
 */
export function resolveVisualProjectionLod(
  detailLevel: GlobeDetailLevel,
): VisualProjectionLod {
  if (detailLevel === "space" || detailLevel === "region") {
    return "glyph";
  }
  if (detailLevel === "city") {
    return "glyph_label";
  }
  return "image";
}

export function resolveMarkerVisualLod(
  input: ResolveMarkerLodInput,
): VisualProjectionLod {
  const tier: ProjectionTier = input.tier ?? "foreground";
  if (tier === "hidden") {
    return "glyph";
  }
  const lod = resolveVisualProjectionLod(input.detailLevel);
  // Background objects stay glyph-level until street/pin.
  if (tier === "background" && lod === "image") {
    return input.detailLevel === "pin" ? "image" : "glyph_label";
  }
  return lod;
}
