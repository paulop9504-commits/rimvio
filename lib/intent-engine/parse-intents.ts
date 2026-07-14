import { INTENT_LIBRARY } from "@/lib/intent-engine/intent-library";
import type { ParsedIntentHit } from "@/lib/intent-engine/types";

/**
 * Intent Parser — extract library intent hits from NL.
 * Does not invent destinations/dates; cues only attach known library rows.
 */
export function parseIntents(text: string): ParsedIntentHit[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const hits: ParsedIntentHit[] = [];
  for (const entry of INTENT_LIBRARY) {
    for (const cue of entry.cues) {
      const match = cue.exec(trimmed);
      if (!match) {
        continue;
      }
      hits.push({
        libraryId: entry.id,
        category: entry.category,
        labelKo: entry.labelKo,
        factKind: "explicit",
        confidence: 0.9,
        cue: match[0],
      });
      break;
    }
  }

  return dedupeHits(hits);
}

function dedupeHits(hits: ParsedIntentHit[]): ParsedIntentHit[] {
  const byId = new Map<string, ParsedIntentHit>();
  for (const hit of hits) {
    const prev = byId.get(hit.libraryId);
    if (!prev || hit.confidence > prev.confidence) {
      byId.set(hit.libraryId, hit);
    }
  }
  return [...byId.values()].sort((a, b) => b.confidence - a.confidence);
}
