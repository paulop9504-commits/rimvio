import type { ExperienceIntent } from "@/lib/experience-intent/experience-intent-types";
import type { PersonNode } from "@/lib/people-graph/person-types";
import type { PersonExperienceSlice } from "@/lib/experience-context/unified-experience-context-types";

export type ExperienceDomainCue = "travel" | "food" | "social" | null;

const DOMAIN_INTENTS: Record<NonNullable<ExperienceDomainCue>, readonly ExperienceIntent[]> = {
  travel: ["travel"],
  food: ["food"],
  social: ["wedding", "birthday", "family", "date", "meeting", "concert"],
};

export function detectExperienceDomainCue(message: string): ExperienceDomainCue {
  const text = message.trim();
  if (!text) {
    return null;
  }
  if (/(?:여행|다녀|갔|trip|travel|출장|휴가|관광)/iu.test(text)) {
    return "travel";
  }
  if (/(?:맛집|식당|카페|먹|food|dining)/iu.test(text)) {
    return "food";
  }
  if (/(?:만나|약속|모임|친구|동료)/iu.test(text)) {
    return "social";
  }
  return null;
}

function experienceMatchesDomain(
  intent: ExperienceIntent,
  domainCue: ExperienceDomainCue,
): boolean {
  if (!domainCue) {
    return true;
  }
  return DOMAIN_INTENTS[domainCue].includes(intent);
}

/** Cross-filter matched people by travel/food/social domain cue. */
export function projectPersonExperienceSlice(input: {
  matchedPeople: readonly PersonNode[];
  domainCue: ExperienceDomainCue;
}): PersonExperienceSlice[] {
  if (input.matchedPeople.length === 0) {
    return [];
  }

  const rows: PersonExperienceSlice[] = [];

  for (const person of input.matchedPeople) {
    const experiences = person.experiences.filter((row) =>
      experienceMatchesDomain(row.intent, input.domainCue),
    );
    const places =
      input.domainCue === "travel" || input.domainCue === null
        ? [...person.places]
        : person.places.filter((row) => row.eventCount > 0);

    if (experiences.length === 0 && places.length === 0) {
      continue;
    }

    rows.push({
      personId: person.id,
      displayName: person.displayName,
      experiences,
      places,
    });
  }

  return rows;
}
