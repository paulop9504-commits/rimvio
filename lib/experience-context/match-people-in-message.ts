import { personLabelsMatch } from "@/lib/people-graph/match-person-label";
import type { PersonNode } from "@/lib/people-graph/person-types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function messageMentionsPerson(message: string, displayName: string): boolean {
  const name = displayName.trim();
  if (!name || name.length < 2) {
    return false;
  }

  if (message.includes(name)) {
    return true;
  }

  if (personLabelsMatch(message, name)) {
    return true;
  }

  try {
    return new RegExp(escapeRegExp(name), "iu").test(message);
  } catch {
    return false;
  }
}

/** Match known people-graph nodes mentioned in the user message. */
export function matchPeopleInMessage(
  message: string,
  people: readonly PersonNode[],
): PersonNode[] {
  const trimmed = message.trim();
  if (!trimmed || people.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const hits: PersonNode[] = [];

  for (const person of people) {
    if (seen.has(person.id)) {
      continue;
    }
    if (!messageMentionsPerson(trimmed, person.displayName)) {
      continue;
    }
    seen.add(person.id);
    hits.push(person);
  }

  return hits.sort(
    (left, right) =>
      right.relationshipScore.total - left.relationshipScore.total ||
      right.meaningScore - left.meaningScore,
  );
}
