import { getIntentLibraryEntry } from "@/lib/intent-engine/intent-library";
import type { EnrichedIntent, ParsedIntentHit } from "@/lib/intent-engine/types";

/**
 * Semantic Engine — attach closed moods / styles / profile from Intent Library.
 */
export function expandIntentSemantics(hits: ParsedIntentHit[]): EnrichedIntent[] {
  const out: EnrichedIntent[] = [];
  for (const hit of hits) {
    const entry = getIntentLibraryEntry(hit.libraryId);
    if (!entry) {
      continue;
    }
    out.push({
      libraryId: entry.id,
      category: entry.category,
      labelKo: entry.labelKo,
      factKind: hit.factKind,
      confidence: hit.confidence,
      moods: [...entry.moods],
      styles: [...entry.styles],
      profile: { ...entry.profile },
      constraints: [...(entry.constraints ?? [])],
      priorities: [...(entry.priorities ?? [])],
    });
  }
  return out;
}
