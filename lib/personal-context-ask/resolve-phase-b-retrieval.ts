import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ParsedPersonalContextQuery,
  PersonalContextBridgeHit,
} from "@/lib/personal-context-ask/personal-context-ask-types";
import type { RecallEventSnapshot } from "@/lib/recall/recall-event-snapshot";
import { queryPersonalMemoryTopK } from "@/lib/personal-memory/query-top-k";

export type PersonalContextRetrievalSource = "lexical" | "semantic";

/** Phase B — stricter semantic gate than Phase A default recall. */
export const PHASE_B_SEMANTIC_MIN_SCORE = 0.28;

const MAX_HITS = 5;

export function mergePhaseBRetrieval(input: {
  lexicalHits: readonly PersonalContextBridgeHit[];
  events: readonly EventCandidate[];
  query: string;
  snapshots: readonly RecallEventSnapshot[];
  toHit: (snapshot: RecallEventSnapshot, reasonKo: string, source: PersonalContextRetrievalSource) => PersonalContextBridgeHit;
  enableSemantic?: boolean;
}): PersonalContextBridgeHit[] {
  if (input.enableSemantic === false) {
    return [...input.lexicalHits];
  }

  const semantic = queryPersonalMemoryTopK({
    query: input.query,
    events: input.events,
    k: MAX_HITS,
    minScore: PHASE_B_SEMANTIC_MIN_SCORE,
  });

  if (semantic.length === 0) {
    return [...input.lexicalHits];
  }

  const byId = new Map(input.snapshots.map((row) => [row.eventId, row]));
  const merged = new Map<string, PersonalContextBridgeHit>();

  for (const hit of input.lexicalHits) {
    merged.set(hit.eventId, { ...hit, retrievalSource: hit.retrievalSource ?? "lexical" });
  }

  for (const row of semantic) {
    if (merged.has(row.eventId)) {
      continue;
    }
    const snap = byId.get(row.eventId);
    if (!snap) {
      continue;
    }
    merged.set(
      row.eventId,
      input.toHit(snap, "그때 거기", "semantic"),
    );
  }

  const order = [
    ...input.lexicalHits.map((hit) => hit.eventId),
    ...semantic.map((row) => row.eventId),
  ];
  const seen = new Set<string>();
  const out: PersonalContextBridgeHit[] = [];
  for (const id of order) {
    if (seen.has(id)) {
      continue;
    }
    const hit = merged.get(id);
    if (!hit) {
      continue;
    }
    seen.add(id);
    out.push(hit);
    if (out.length >= MAX_HITS) {
      break;
    }
  }
  return out;
}

export function shouldUsePhaseBSemantic(parsed: ParsedPersonalContextQuery): boolean {
  if (
    parsed.intent === "travel_recall" ||
    parsed.intent === "general" ||
    parsed.intent === "place_with_person" ||
    parsed.intent === "bridge_context"
  ) {
    return true;
  }
  return parsed.intent === "last_meet_place";
}

export function phaseBAllowsSemanticFallback(
  parsed: ParsedPersonalContextQuery,
  lexicalCount: number,
): boolean {
  if (lexicalCount > 0 && parsed.intent !== "general" && parsed.intent !== "bridge_context") {
    return false;
  }
  return shouldUsePhaseBSemantic(parsed);
}
