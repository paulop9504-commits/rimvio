/**
 * Ingress pre-find — rank existing contexts before minting a new Container.
 * Hits always surface as ask_chips (no quiet auto-attach). Commit stays human.
 */

import { buildSearchableExperienceIndex } from "@/lib/search/build-searchable-experience-index";
import { searchRelatedContext } from "@/lib/search/search-related-context";
import { splitContextSearchQuery } from "@/lib/search/split-context-search-query";
import { resolveContextMeaningWhyLine } from "@/lib/meaning/resolve-context-meaning-why-line";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type IngressConvergeHit = {
  readonly eventId: string;
  readonly headline: string;
  readonly score: number;
  readonly meaningWhy: string | null;
  readonly place: string | null;
};

/** Chips-first when related hits exist; create_new when none. */
export type IngressConvergeDecision = "ask_chips" | "create_new";

export type IngressContextConvergeResult = {
  readonly seedUtterance: string;
  readonly decision: IngressConvergeDecision;
  readonly hits: readonly IngressConvergeHit[];
};

/** Floor so weak lexical noise does not force chips. */
const MIN_HIT_SCORE = 8;

/** Pure — utterance + events → converge decision (no Commit, no mint). */
export function resolveIngressContextConverge(input: {
  utterance: string;
  events: readonly EventCandidate[];
  limit?: number;
}): IngressContextConvergeResult {
  const seedUtterance = input.utterance.trim();
  if (!seedUtterance) {
    return {
      seedUtterance: "",
      decision: "create_new",
      hits: [],
    };
  }

  const { experienceTerms, peopleTerms } = splitContextSearchQuery(seedUtterance);
  const queryParts = [...experienceTerms, ...peopleTerms];
  const query = queryParts.length > 0 ? queryParts.join(" ") : seedUtterance;

  const index = buildSearchableExperienceIndex(input.events);
  const ranked = searchRelatedContext(index, query, input.limit ?? 5);

  const hits: IngressConvergeHit[] = ranked
    .filter((row) => row.score >= MIN_HIT_SCORE)
    .map((row) => {
      const event = input.events.find((e) => e.id === row.eventId) ?? null;
      const peer =
        (typeof event?.metadata?.planPeerDisplayName === "string"
          ? event.metadata.planPeerDisplayName.trim()
          : "") || "";
      const place = row.place?.trim() || event?.place?.trim() || "";
      const fallbackWhy = [peer, place].filter(Boolean).join(" · ") || null;
      return {
        eventId: row.eventId,
        headline: row.headline,
        score: row.score,
        meaningWhy:
          resolveContextMeaningWhyLine({
            event,
            events: input.events,
          }) ?? fallbackWhy,
        place: place || null,
      };
    });

  return {
    seedUtterance,
    decision: hits.length > 0 ? "ask_chips" : "create_new",
    hits,
  };
}
