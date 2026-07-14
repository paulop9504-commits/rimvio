/**
 * Ingress pre-find — rank existing contexts before minting a new Container.
 * Cursor-like magic: high-confidence single hit → auto_attach (no chip tap).
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

export type IngressConvergeDecision =
  | "auto_attach"
  | "ask_chips"
  | "create_new";

export type IngressContextConvergeResult = {
  readonly seedUtterance: string;
  readonly decision: IngressConvergeDecision;
  readonly hits: readonly IngressConvergeHit[];
  /** Present when decision is auto_attach. */
  readonly attachEventId: string | null;
};

/** Auto-attach when one clear winner — minimize human taps (Cursor magic). */
const AUTO_ATTACH_MIN_SCORE = 18;
const AUTO_ATTACH_GAP = 8;

function resolveDecision(
  hits: readonly IngressConvergeHit[],
): IngressConvergeDecision {
  if (hits.length === 0) {
    return "create_new";
  }
  const top = hits[0]!;
  if (top.score < AUTO_ATTACH_MIN_SCORE) {
    return hits.length >= 1 ? "ask_chips" : "create_new";
  }
  const second = hits[1];
  if (!second || top.score - second.score >= AUTO_ATTACH_GAP) {
    return "auto_attach";
  }
  return "ask_chips";
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
      attachEventId: null,
    };
  }

  const { experienceTerms, peopleTerms } = splitContextSearchQuery(seedUtterance);
  const queryParts = [...experienceTerms, ...peopleTerms];
  const query = queryParts.length > 0 ? queryParts.join(" ") : seedUtterance;

  const index = buildSearchableExperienceIndex(input.events);
  const ranked = searchRelatedContext(index, query, input.limit ?? 5);

  const hits: IngressConvergeHit[] = ranked.map((row) => {
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

  const decision = resolveDecision(hits);
  return {
    seedUtterance,
    decision,
    hits,
    attachEventId: decision === "auto_attach" ? hits[0]!.eventId : null,
  };
}
