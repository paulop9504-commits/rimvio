import type { RealityObjectType } from "@/lib/reality-object/types";
import { inferVisualSubject } from "@/lib/visual-projection/infer-visual-subject";
import type { VisualSubjectKind } from "@/lib/visual-projection/types";
import { visualLayerRuleForType } from "@/lib/visual-projection/visual-layer-rules";

/** Subjects where cropping/nukki usually destroys meaning. */
const SCENE_SUBJECT_RE =
  /night|야경|skyline|cityscape|도시|cherry|sakura|벚꽃|beach|해변|onsen|온천|market|시장|street.?view|풍경|scenery|park.?path|정원/iu;

export type SegmentationDecision = {
  readonly useSegmentation: boolean;
  readonly recognitionScore: number;
  readonly segmentationScore: number;
  readonly reason:
    | "subject_fits_cutout"
    | "scene_keep_original"
    | "low_recognition"
    | "type_avoids_cutout";
};

/**
 * Projection Score → Use Segmentation? YES/NO.
 * Never mandatory nukki — nightscapes / markets / beaches stay original.
 */
export function decideSegmentation(input: {
  objectType: RealityObjectType;
  imageUrl: string;
  subjectHint?: VisualSubjectKind | null;
  caption?: string | null;
  /** 0–100 recognition from visual scoring. */
  recognitionScore: number;
}): SegmentationDecision {
  const subject = inferVisualSubject({
    url: input.imageUrl,
    subjectHint: input.subjectHint,
    caption: input.caption,
  });
  const rule = visualLayerRuleForType(input.objectType);
  const recognitionScore = Math.max(
    0,
    Math.min(100, Math.round(input.recognitionScore)),
  );

  const hay = `${input.imageUrl} ${input.caption ?? ""}`;
  const isScene =
    SCENE_SUBJECT_RE.test(hay) ||
    subject === "building_exterior" ||
    (subject === "landmark_full" &&
      /park|beach|market|night|풍경/iu.test(hay));

  if (isScene || rule.avoidSegmentationSubjects.includes(subject)) {
    return {
      useSegmentation: false,
      recognitionScore,
      segmentationScore: isScene ? 24 : 32,
      reason: "scene_keep_original",
    };
  }

  if (recognitionScore < 70) {
    return {
      useSegmentation: false,
      recognitionScore,
      segmentationScore: 40,
      reason: "low_recognition",
    };
  }

  const preferred = subject === rule.preferredSubject;
  const cutoutFriendly =
    subject === "food" ||
    subject === "room" ||
    subject === "landmark_full" ||
    preferred;

  if (!cutoutFriendly) {
    return {
      useSegmentation: false,
      recognitionScore,
      segmentationScore: 28,
      reason: "type_avoids_cutout",
    };
  }

  const segmentationScore = Math.min(
    98,
    recognitionScore - (preferred ? 0 : 8) + (subject === "food" || subject === "room" ? 2 : 0),
  );

  return {
    useSegmentation: segmentationScore >= 85,
    recognitionScore,
    segmentationScore,
    reason: "subject_fits_cutout",
  };
}
