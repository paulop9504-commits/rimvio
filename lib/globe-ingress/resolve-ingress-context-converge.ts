/**
 * Ingress pre-find — rank existing contexts before minting a new Container.
 * Hits may surface as ask_chips only when choices can render; else create_new.
 * Actionable trip work → create_new (ADR-036 — no Context pick quiz).
 */

import { buildSearchableExperienceIndex } from "@/lib/search/build-searchable-experience-index";
import { searchRelatedContext } from "@/lib/search/search-related-context";
import { splitContextSearchQuery } from "@/lib/search/split-context-search-query";
import { resolveContextMeaningWhyLine } from "@/lib/meaning/resolve-context-meaning-why-line";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import { parseTravelSlotsFromMessage } from "@/lib/experience-run/travel-context-slots";

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

/**
 * Clear destination / duration / plan → mint work, don't quiz “비슷한 맥락 고르세요”.
 */
export function isActionableTripWorkUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  const ref = new Date().toISOString().slice(0, 10);
  const slots = parseTravelSlotsFromMessage(text, ref);
  if (slots.destination?.trim() || slots.durationDays) return true;
  if (extractRunDestination(text)?.trim()) return true;
  if (
    /(?:계획|일정|동선|준비|세워|짜|만들|찾아|예약)/u.test(text) &&
    /(?:여행|출장|도쿄|오사카|제주|후쿠오카|일본|해외|trip)/iu.test(text)
  ) {
    return true;
  }
  return false;
}

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

  // ADR-036 — work becomes context; don't interrupt actionable trip work with a Context picker.
  if (isActionableTripWorkUtterance(seedUtterance)) {
    return {
      seedUtterance,
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
