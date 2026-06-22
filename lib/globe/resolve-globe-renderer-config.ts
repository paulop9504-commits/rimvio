import type { WebGLRendererParameters } from "three";
import { isAndroid } from "@/lib/platform/device";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";

/** WebGL init tuned for Android GPU variance (Mali / Adreno tile uploads). */
export function resolveGlobeRendererConfig(): WebGLRendererParameters {
  const android = isAndroid();
  return {
    antialias: !android,
    alpha: true,
    precision: android ? "mediump" : "highp",
    powerPreference: android ? "default" : "high-performance",
  };
}

export function resolveGlobePixelRatioCap(): number {
  if (typeof window === "undefined") {
    return GLOBE_TOSS_THEME.globePixelRatioCap;
  }
  if (isAndroid()) {
    return Math.min(GLOBE_TOSS_THEME.globePixelRatioCap, 1.5);
  }
  return GLOBE_TOSS_THEME.globePixelRatioCap;
}

/** CSS `filter` on WebGL canvas blanks tiles on many Android WebViews. */
export function shouldDisableGlobeCanvasCssFilter(): boolean {
  return isAndroid();
}
