import type { RealityObjectType } from "@/lib/reality-object/types";
import type { VisualSubjectKind } from "@/lib/visual-projection/types";

/**
 * Representativeness stars (0–5) — "what best stands for this place".
 * Restaurant → food; Hotel → room; Landmark → full exterior.
 */
const MATRIX: Partial<
  Record<RealityObjectType, Partial<Record<VisualSubjectKind, number>>>
> = {
  restaurant: {
    food: 5,
    signage: 2,
    kitchen: 1,
    building_exterior: 0,
    interior: 2,
    unknown: 1,
  },
  cafe: {
    food: 5,
    signage: 2,
    interior: 3,
    building_exterior: 1,
    unknown: 1,
  },
  hotel: {
    room: 5,
    pool: 3,
    lobby: 3,
    building_exterior: 2,
    entrance: 2,
    interior: 3,
    unknown: 1,
  },
  accommodation: {
    room: 5,
    lobby: 3,
    building_exterior: 2,
    interior: 3,
    unknown: 1,
  },
  landmark: {
    landmark_full: 5,
    entrance: 2,
    interior: 1,
    building_exterior: 4,
    unknown: 2,
  },
  activity: {
    landmark_full: 4,
    entrance: 2,
    interior: 2,
    building_exterior: 3,
    unknown: 2,
  },
  shopping: {
    signage: 4,
    building_exterior: 3,
    interior: 3,
    food: 1,
    unknown: 2,
  },
};

const DEFAULT_BY_SUBJECT: Partial<Record<VisualSubjectKind, number>> = {
  food: 3,
  room: 3,
  landmark_full: 3,
  building_exterior: 2,
  unknown: 1,
};

export function representativenessStars(input: {
  objectType: RealityObjectType;
  subject: VisualSubjectKind;
}): number {
  const byType = MATRIX[input.objectType]?.[input.subject];
  if (typeof byType === "number") {
    return byType;
  }
  return DEFAULT_BY_SUBJECT[input.subject] ?? 1;
}
