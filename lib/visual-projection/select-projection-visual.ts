import type { RealityObjectType } from "@/lib/reality-object/types";
import { decideSegmentation } from "@/lib/visual-projection/decide-segmentation";
import { inferVisualSubject } from "@/lib/visual-projection/infer-visual-subject";
import { representativenessStars } from "@/lib/visual-projection/representativeness";
import {
  runSelectiveSegmentation,
  type SelectiveSegmentationResult,
} from "@/lib/visual-projection/run-selective-segmentation";
import type {
  VisualCandidate,
  VisualProjectionSelection,
  VisualScoreBreakdown,
  VisualSubjectKind,
} from "@/lib/visual-projection/types";
import { visualLayerRuleForType } from "@/lib/visual-projection/visual-layer-rules";

function clampStars(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(5, Math.round(value)));
}

/**
 * Recognition · Aesthetic · Projection · Representativeness → total 0–100.
 * Deterministic heuristics (URL/subject); no mandatory segmentation.
 */
export function scoreVisualCandidate(input: {
  objectType: RealityObjectType;
  candidate: VisualCandidate;
  caption?: string | null;
}): { subject: VisualSubjectKind; score: VisualScoreBreakdown } {
  const subject = inferVisualSubject({
    url: input.candidate.url,
    subjectHint: input.candidate.subjectHint,
    caption: input.caption,
  });
  const rule = visualLayerRuleForType(input.objectType);
  const baseRep = representativenessStars({
    objectType: input.objectType,
    subject,
  });
  const representativeness = clampStars(
    subject === rule.preferredSubject ? Math.max(baseRep, 4) : baseRep,
  );

  const recognition = clampStars(
    representativeness >= 4 ? 5 : representativeness >= 2 ? 3 : 2,
  );

  const aestheticHint = input.candidate.aestheticHint;
  const aesthetic = clampStars(
    aestheticHint != null
      ? aestheticHint
      : subject === "unknown"
        ? 2
        : representativeness >= 4
          ? 5
          : 3,
  );

  const projection = clampStars(
    subject === "food" ||
      subject === "room" ||
      subject === "landmark_full"
      ? 5
      : subject === "building_exterior" || subject === "signage"
        ? 2
        : representativeness,
  );

  const total = Math.round(
    ((recognition + aesthetic + projection + representativeness) / 20) * 100,
  );

  return {
    subject,
    score: {
      recognition,
      aesthetic,
      projection,
      representativeness,
      total,
    },
  };
}

export type VisualProjectionSelectionWithGate = VisualProjectionSelection & {
  readonly useSegmentation: boolean;
  readonly segmentationScore: number;
};

/** Pick the image that best represents the Reality Object on the Globe. */
export function selectProjectionVisual(input: {
  objectType: RealityObjectType;
  candidates: readonly VisualCandidate[];
  caption?: string | null;
}): VisualProjectionSelectionWithGate | null {
  const scored = input.candidates
    .map((candidate) => {
      const url = candidate.url?.trim();
      if (!url) {
        return null;
      }
      const { subject, score } = scoreVisualCandidate({
        objectType: input.objectType,
        candidate: { ...candidate, url },
        caption: input.caption,
      });
      const gate = decideSegmentation({
        objectType: input.objectType,
        imageUrl: url,
        subjectHint: subject,
        caption: input.caption,
        recognitionScore: score.total,
      });
      return {
        url,
        subject,
        score,
        useSegmentation: gate.useSegmentation,
        segmentationScore: gate.segmentationScore,
      };
    })
    .filter((row): row is VisualProjectionSelectionWithGate => row != null);

  if (scored.length === 0) {
    return null;
  }

  scored.sort((a, b) => {
    if (b.score.total !== a.score.total) {
      return b.score.total - a.score.total;
    }
    return b.score.representativeness - a.score.representativeness;
  });

  return scored[0]!;
}

/** Select cover URL + run selective segmentation pipeline (YES → cutout). */
export function selectProjectionVisualWithSegmentation(input: {
  objectType: RealityObjectType;
  candidates: readonly VisualCandidate[];
  caption?: string | null;
}): {
  selection: VisualProjectionSelectionWithGate;
  segmentation: SelectiveSegmentationResult;
} | null {
  const selection = selectProjectionVisual(input);
  if (!selection) {
    return null;
  }
  const segmentation = runSelectiveSegmentation({
    objectType: input.objectType,
    imageUrl: selection.url,
    recognitionScore: selection.score.total,
    subjectHint: selection.subject,
    caption: input.caption,
  });
  return { selection, segmentation };
}

export function selectProjectionVisualUrl(input: {
  objectType: RealityObjectType;
  imageUrls: readonly string[];
  preferredUrl?: string | null;
  caption?: string | null;
}): string | null {
  const urls = [
    ...(input.preferredUrl?.trim() ? [input.preferredUrl.trim()] : []),
    ...input.imageUrls.map((u) => u.trim()).filter(Boolean),
  ];
  const unique = [...new Set(urls)];
  const selection = selectProjectionVisual({
    objectType: input.objectType,
    candidates: unique.map((url) => ({ url })),
    caption: input.caption,
  });
  return selection?.url ?? null;
}
