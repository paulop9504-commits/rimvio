/**
 * Ask / trigger → top-k personal Context summon (semantic, my globe only).
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildPersonalMemoryIndex,
  type PersonalMemoryChunk,
} from "@/lib/personal-memory/chunk-event-memory";
import {
  cosineSimilarity,
  embedMemoryText,
} from "@/lib/personal-memory/hashed-embedding";

export type PersonalMemoryHit = {
  readonly eventId: string;
  readonly score: number;
  readonly chunkId: string;
  readonly kind: PersonalMemoryChunk["kind"];
  readonly place: string | null;
};

const DEFAULT_MIN_SCORE = 0.22;

/** Cosine top-k over personal memory chunks → unique eventIds. */
export function queryPersonalMemoryTopK(input: {
  readonly query: string;
  readonly events: readonly EventCandidate[];
  readonly k?: number;
  readonly minScore?: number;
  readonly now?: Date;
}): PersonalMemoryHit[] {
  const query = input.query.trim();
  if (!query || input.events.length === 0) {
    return [];
  }

  const k = Math.max(1, Math.min(input.k ?? 5, 12));
  const minScore = input.minScore ?? DEFAULT_MIN_SCORE;
  const queryVec = embedMemoryText(query);
  const chunks = buildPersonalMemoryIndex(input.events, input.now ?? new Date());

  const scored = chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryVec, chunk.embedding),
    }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score || a.chunk.eventId.localeCompare(b.chunk.eventId));

  const seen = new Set<string>();
  const hits: PersonalMemoryHit[] = [];
  for (const row of scored) {
    if (seen.has(row.chunk.eventId)) {
      continue;
    }
    seen.add(row.chunk.eventId);
    hits.push({
      eventId: row.chunk.eventId,
      score: row.score,
      chunkId: row.chunk.chunkId,
      kind: row.chunk.kind,
      place: row.chunk.place,
    });
    if (hits.length >= k) {
      break;
    }
  }
  return hits;
}
