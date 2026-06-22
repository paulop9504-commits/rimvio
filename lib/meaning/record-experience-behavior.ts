import { appendExperienceBehaviorRecord } from "@/lib/meaning/experience-behavior-store";
import type { ExperienceBehaviorKind } from "@/lib/meaning/experience-behavior-types";

export function recordExperienceBehavior(input: {
  eventId: string;
  kind: ExperienceBehaviorKind;
  atIso?: string;
}): void {
  appendExperienceBehaviorRecord(input);
}
