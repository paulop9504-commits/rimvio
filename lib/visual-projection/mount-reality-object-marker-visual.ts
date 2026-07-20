import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import { applyObjectProjectionDomStyle } from "@/lib/visual-projection/apply-object-projection-dom";
import {
  createObjectGlyphElement,
  createObjectHaloElement,
} from "@/lib/visual-projection/apply-object-projection-dom";
import { resolveObjectHaloStyleFromPinKind } from "@/lib/visual-projection/object-halo";
import { resolveMarkerVisualLod } from "@/lib/visual-projection/resolve-marker-lod";
import type {
  ObjectHaloFamily,
  ObjectHaloStyle,
  ProjectionTier,
  VisualProjectionLod,
} from "@/lib/visual-projection/types";
import type { ContextBloomRole } from "@/lib/visual-projection/context-bloom-types";
import type { CutoutPresentationMode } from "@/lib/visual-projection/run-selective-segmentation";

export type RealityObjectMarkerVisualInput = {
  root: HTMLElement;
  detailLevel?: GlobeDetailLevel | null;
  pinKind: "eatery" | "lodging" | "activity" | "amenity";
  label: string;
  shortLabel?: string | null;
  thumbnailUrl?: string | null;
  objectGlyph?: string | null;
  objectHaloFamily?: ObjectHaloFamily | null;
  projectionTier?: ProjectionTier | null;
  discoveryAccent?: "green" | "blue" | "orange" | "purple" | null;
  bloomRole?: ContextBloomRole | null;
  bloomDelayMs?: number;
  /** Selective segmentation — YES only soft cutout. */
  useSegmentation?: boolean | null;
  cutoutMode?: CutoutPresentationMode | null;
};

/**
 * Mount floating Reality Object presentation by zoom LOD.
 * glyph → glyph+label → cover image (+ halo always).
 * When useSegmentation, cover gets soft cutout mask (never mandatory nukki).
 */
export function mountRealityObjectMarkerVisual(
  input: RealityObjectMarkerVisualInput,
): { lod: VisualProjectionLod; halo: ObjectHaloStyle } {
  const haloBase = resolveObjectHaloStyleFromPinKind(input.pinKind);
  const halo: ObjectHaloStyle = {
    ...haloBase,
    glyph: input.objectGlyph?.trim() || haloBase.glyph,
    family: input.objectHaloFamily ?? haloBase.family,
    discoveryAccent: input.discoveryAccent ?? haloBase.discoveryAccent,
  };
  const lod = resolveMarkerVisualLod({
    detailLevel: input.detailLevel ?? "neighborhood",
    tier: input.projectionTier ?? "foreground",
  });

  applyObjectProjectionDomStyle({
    root: input.root,
    halo,
    lod,
    tier: input.projectionTier ?? "foreground",
    bloomRole: input.bloomRole,
    bloomDelayMs: input.bloomDelayMs,
  });
  if (input.discoveryAccent || halo.discoveryAccent) {
    input.root.dataset.discoveryAccent =
      input.discoveryAccent ?? halo.discoveryAccent;
  }

  const cutoutMode =
    input.useSegmentation && input.cutoutMode && input.cutoutMode !== "none"
      ? input.cutoutMode
      : "none";
  if (cutoutMode !== "none") {
    input.root.dataset.objectCutout = cutoutMode;
  } else {
    delete input.root.dataset.objectCutout;
  }

  input.root.appendChild(createObjectHaloElement());

  const shell = document.createElement("span");
  shell.className = "rimvio-globe-reality-object__shell";

  if (lod === "glyph" || lod === "glyph_label") {
    shell.appendChild(createObjectGlyphElement(halo.glyph));
  }

  if (lod === "glyph_label") {
    const name = document.createElement("span");
    name.className = "rimvio-globe-reality-object__label";
    name.textContent =
      input.shortLabel?.trim() || input.label.trim().slice(0, 18);
    shell.appendChild(name);
  }

  if (lod === "image") {
    const thumbUrl = input.thumbnailUrl?.trim();
    if (thumbUrl) {
      const frame = document.createElement("span");
      frame.className = "rimvio-globe-reality-object__frame";
      if (cutoutMode !== "none") {
        frame.dataset.objectCutout = cutoutMode;
      }
      const img = document.createElement("img");
      img.src = thumbUrl;
      img.alt = "";
      img.draggable = false;
      img.className = "rimvio-globe-reality-object__cover";
      img.addEventListener("error", () => {
        frame.replaceChildren(createObjectGlyphElement(halo.glyph));
      });
      frame.appendChild(img);
      shell.appendChild(frame);
    } else {
      shell.appendChild(createObjectGlyphElement(halo.glyph));
      const name = document.createElement("span");
      name.className = "rimvio-globe-reality-object__label";
      name.textContent =
        input.shortLabel?.trim() || input.label.trim().slice(0, 18);
      shell.appendChild(name);
    }
  }

  input.root.appendChild(shell);
  return { lod, halo };
}
