/** Thin facade — projection-only context weight (MEANING + behavior). */
export {
  EXPERIENCE_BEHAVIOR_WEIGHTS,
  type ExperienceBehaviorKind,
  type ExperienceBehaviorRecord,
} from "@/lib/meaning/experience-behavior-types";

export {
  appendExperienceBehaviorRecord,
  listExperienceBehaviorRecords,
  readExperienceBehaviorScore,
} from "@/lib/meaning/experience-behavior-store";

export { recordExperienceBehavior } from "@/lib/meaning/record-experience-behavior";

export {
  EXPERIENCE_MEANING_TAG_KEYS,
  readExperienceMeaningTags,
  scoreExperienceMeaningTags,
  type ExperienceMeaningPurpose,
  type ExperienceMeaningTags,
} from "@/lib/meaning/read-experience-meaning-tags";

export {
  scoreExperienceMeaning,
  type ExperienceMeaningWeight,
} from "@/lib/meaning/score-experience-meaning";
