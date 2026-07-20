import type { ObjectHaloStyle } from "@/lib/visual-projection/types";
import type { VisualProjectionLod } from "@/lib/visual-projection/types";
import type { ContextBloomRole } from "@/lib/visual-projection/context-bloom-types";

/** Apply floating object + halo datasets used by globals.css. */
export function applyObjectProjectionDomStyle(input: {
  root: HTMLElement;
  halo: ObjectHaloStyle;
  lod: VisualProjectionLod;
  tier?: "foreground" | "background" | "hidden";
  bloomRole?: ContextBloomRole | null;
  bloomDelayMs?: number;
}): void {
  const { root, halo, lod } = input;
  root.classList.add("rimvio-globe-reality-object");
  root.dataset.objectHalo = halo.family;
  root.dataset.objectLod = lod;
  root.dataset.objectAspect = halo.aspectRatio;
  if (input.tier) {
    root.dataset.projectionTier = input.tier;
  }
  root.style.setProperty("--rimvio-object-halo", halo.haloColor);

  const bloomRole = input.bloomRole ?? "none";
  root.dataset.contextBloom = bloomRole;
  if (bloomRole === "related" && (input.bloomDelayMs ?? 0) > 0) {
    root.style.setProperty(
      "--rimvio-bloom-delay",
      `${input.bloomDelayMs ?? 0}ms`,
    );
  } else {
    root.style.removeProperty("--rimvio-bloom-delay");
  }
}

export function createObjectGlyphElement(glyph: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "rimvio-globe-reality-object__glyph";
  span.textContent = glyph;
  span.setAttribute("aria-hidden", "true");
  return span;
}

export function createObjectHaloElement(): HTMLElement {
  const halo = document.createElement("span");
  halo.className = "rimvio-globe-reality-object__halo";
  halo.setAttribute("aria-hidden", "true");
  return halo;
}
