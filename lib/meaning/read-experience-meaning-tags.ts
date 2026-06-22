import type { EventCandidate } from "@/lib/events/event-candidate";

export const EXPERIENCE_MEANING_TAG_KEYS = {
  mood: "experienceMeaningMood",
  purpose: "experienceMeaningPurpose",
  importance: "experienceMeaningImportance",
} as const;

export type ExperienceMeaningPurpose = "work" | "personal" | "travel";

export type ExperienceMeaningTags = {
  mood: string | null;
  purpose: ExperienceMeaningPurpose | null;
  importance: 1 | 2 | 3 | null;
};

function readMetaString(
  event: EventCandidate,
  key: string,
): string | null {
  const raw = event.metadata?.[key];
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed || null;
}

function readImportance(event: EventCandidate): 1 | 2 | 3 | null {
  const raw = readMetaString(event, EXPERIENCE_MEANING_TAG_KEYS.importance);
  if (raw === "1" || raw === "2" || raw === "3") {
    return Number(raw) as 1 | 2 | 3;
  }
  return null;
}

function readPurpose(event: EventCandidate): ExperienceMeaningPurpose | null {
  const raw = readMetaString(event, EXPERIENCE_MEANING_TAG_KEYS.purpose);
  if (raw === "work" || raw === "personal" || raw === "travel") {
    return raw;
  }
  return null;
}

export function readExperienceMeaningTags(
  event: EventCandidate,
): ExperienceMeaningTags {
  return {
    mood: readMetaString(event, EXPERIENCE_MEANING_TAG_KEYS.mood),
    purpose: readPurpose(event),
    importance: readImportance(event),
  };
}

export function scoreExperienceMeaningTags(tags: ExperienceMeaningTags): number {
  let score = 0;
  if (tags.mood) {
    score += 6;
  }
  if (tags.purpose) {
    score += 8;
  }
  if (tags.importance === 3) {
    score += 14;
  } else if (tags.importance === 2) {
    score += 8;
  } else if (tags.importance === 1) {
    score += 4;
  }
  return Math.min(30, score);
}
