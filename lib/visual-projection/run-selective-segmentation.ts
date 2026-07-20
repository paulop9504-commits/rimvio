/**
 * Selective Segmentation pipeline — execute cutout only when gate says YES.
 * Pixel rembg stays a future adapter behind the same contract; MVP uses
 * CSS soft-cutout presentation (works without CORS, never mandatory nukki).
 */

import type { RealityObjectType } from "@/lib/reality-object/types";
import {
  decideSegmentation,
  type SegmentationDecision,
} from "@/lib/visual-projection/decide-segmentation";
import { inferVisualSubject } from "@/lib/visual-projection/infer-visual-subject";
import type { VisualSubjectKind } from "@/lib/visual-projection/types";

/** Soft presentation cutouts — not mandatory background removal. */
export type CutoutPresentationMode =
  | "none"
  | "soft_blob"
  | "soft_pill"
  | "soft_ellipse";

export type SelectiveSegmentationResult = {
  readonly sourceUrl: string;
  /** Display URL — same as source for CSS path; future rembg may differ. */
  readonly displayUrl: string;
  /** True when cutout presentation is active on Globe. */
  readonly applied: boolean;
  readonly useSegmentation: boolean;
  readonly cutoutMode: CutoutPresentationMode;
  readonly decision: SegmentationDecision;
  readonly subject: VisualSubjectKind;
  readonly pipeline: "skipped" | "css_cutout" | "keep_original";
};

const decisionCache = new Map<string, SelectiveSegmentationResult>();

function cacheKey(input: {
  objectType: RealityObjectType;
  imageUrl: string;
  recognitionScore: number;
}): string {
  return `${input.objectType}|${input.imageUrl}|${Math.round(input.recognitionScore)}`;
}

export function resolveCutoutPresentationMode(input: {
  useSegmentation: boolean;
  subject: VisualSubjectKind;
}): CutoutPresentationMode {
  if (!input.useSegmentation) {
    return "none";
  }
  if (input.subject === "food") {
    return "soft_blob";
  }
  if (input.subject === "room") {
    return "soft_pill";
  }
  if (input.subject === "landmark_full") {
    return "soft_ellipse";
  }
  return "soft_ellipse";
}

/**
 * Run selective segmentation for one cover image.
 * NO → keep original. YES → css_cutout presentation (never forced nukki).
 */
export function runSelectiveSegmentation(input: {
  objectType: RealityObjectType;
  imageUrl: string;
  recognitionScore: number;
  subjectHint?: VisualSubjectKind | null;
  caption?: string | null;
  /** Bypass in-memory cache (tests). */
  skipCache?: boolean;
}): SelectiveSegmentationResult {
  const sourceUrl = input.imageUrl.trim();
  if (!sourceUrl) {
    const decision = decideSegmentation({
      objectType: input.objectType,
      imageUrl: "",
      recognitionScore: 0,
    });
    return {
      sourceUrl: "",
      displayUrl: "",
      applied: false,
      useSegmentation: false,
      cutoutMode: "none",
      decision,
      subject: "unknown",
      pipeline: "skipped",
    };
  }

  const key = cacheKey({
    objectType: input.objectType,
    imageUrl: sourceUrl,
    recognitionScore: input.recognitionScore,
  });
  if (!input.skipCache) {
    const hit = decisionCache.get(key);
    if (hit) {
      return hit;
    }
  }

  const subject = inferVisualSubject({
    url: sourceUrl,
    subjectHint: input.subjectHint,
    caption: input.caption,
  });
  const decision = decideSegmentation({
    objectType: input.objectType,
    imageUrl: sourceUrl,
    subjectHint: subject,
    caption: input.caption,
    recognitionScore: input.recognitionScore,
  });

  if (!decision.useSegmentation) {
    const result: SelectiveSegmentationResult = {
      sourceUrl,
      displayUrl: sourceUrl,
      applied: false,
      useSegmentation: false,
      cutoutMode: "none",
      decision,
      subject,
      pipeline: "keep_original",
    };
    decisionCache.set(key, result);
    return result;
  }

  const cutoutMode = resolveCutoutPresentationMode({
    useSegmentation: true,
    subject,
  });
  const result: SelectiveSegmentationResult = {
    sourceUrl,
    displayUrl: sourceUrl,
    applied: true,
    useSegmentation: true,
    cutoutMode,
    decision,
    subject,
    pipeline: "css_cutout",
  };
  decisionCache.set(key, result);
  return result;
}

export function clearSelectiveSegmentationCache(): void {
  decisionCache.clear();
}

export function readSelectiveSegmentationCacheSize(): number {
  return decisionCache.size;
}
