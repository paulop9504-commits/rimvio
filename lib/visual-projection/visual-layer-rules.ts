/**
 * Visual Layer — each Reality Object type has a representative visual rule.
 * Segmentation is optional and gated; never mandatory nukki.
 */

import type { RealityObjectType } from "@/lib/reality-object/types";
import type { VisualSubjectKind } from "@/lib/visual-projection/types";

export type VisualLayerRule = {
  readonly objectType: RealityObjectType;
  readonly preferredSubject: VisualSubjectKind;
  readonly labelKo: string;
  /** Scenes where nukki/segmentation usually looks wrong. */
  readonly avoidSegmentationSubjects: readonly VisualSubjectKind[];
};

const RULES: Partial<Record<RealityObjectType, VisualLayerRule>> = {
  restaurant: {
    objectType: "restaurant",
    preferredSubject: "food",
    labelKo: "대표 음식",
    avoidSegmentationSubjects: ["building_exterior", "unknown"],
  },
  cafe: {
    objectType: "cafe",
    preferredSubject: "food",
    labelKo: "대표 음료·디저트",
    avoidSegmentationSubjects: ["building_exterior"],
  },
  hotel: {
    objectType: "hotel",
    preferredSubject: "room",
    labelKo: "객실",
    avoidSegmentationSubjects: ["building_exterior"],
  },
  accommodation: {
    objectType: "accommodation",
    preferredSubject: "room",
    labelKo: "객실",
    avoidSegmentationSubjects: ["building_exterior"],
  },
  landmark: {
    objectType: "landmark",
    preferredSubject: "landmark_full",
    labelKo: "건축물·전경",
    avoidSegmentationSubjects: [],
  },
  activity: {
    objectType: "activity",
    preferredSubject: "landmark_full",
    labelKo: "대표 장면",
    avoidSegmentationSubjects: [],
  },
  shopping: {
    objectType: "shopping",
    preferredSubject: "signage",
    labelKo: "대표 골목·간판",
    avoidSegmentationSubjects: ["unknown"],
  },
  experience: {
    objectType: "experience",
    preferredSubject: "landmark_full",
    labelKo: "대표 장면",
    avoidSegmentationSubjects: [],
  },
  photo: {
    objectType: "photo",
    preferredSubject: "unknown",
    labelKo: "사진",
    avoidSegmentationSubjects: ["unknown", "landmark_full", "building_exterior"],
  },
  video: {
    objectType: "video",
    preferredSubject: "unknown",
    labelKo: "포스터·썸네일",
    avoidSegmentationSubjects: ["unknown", "landmark_full"],
  },
  reel: {
    objectType: "reel",
    preferredSubject: "unknown",
    labelKo: "포스터·썸네일",
    avoidSegmentationSubjects: ["unknown", "landmark_full"],
  },
  product: {
    objectType: "product",
    preferredSubject: "food",
    labelKo: "제품",
    avoidSegmentationSubjects: ["building_exterior"],
  },
  person: {
    objectType: "person",
    preferredSubject: "unknown",
    labelKo: "인물",
    avoidSegmentationSubjects: ["landmark_full", "building_exterior"],
  },
  event: {
    objectType: "event",
    preferredSubject: "signage",
    labelKo: "포스터",
    avoidSegmentationSubjects: ["landmark_full"],
  },
};

export function visualLayerRuleForType(
  objectType: RealityObjectType,
): VisualLayerRule {
  return (
    RULES[objectType] ?? {
      objectType,
      preferredSubject: "unknown",
      labelKo: "대표 시각",
      avoidSegmentationSubjects: ["unknown", "building_exterior", "landmark_full"],
    }
  );
}
