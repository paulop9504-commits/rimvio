import { classifyExternalQueryIntent } from "@/lib/external-context-ask/classify-external-query-intent";
import type {
  ExternalContextAskResult,
  ExternalContextOpportunityHit,
  ExternalContextSources,
} from "@/lib/external-context-ask/external-context-opportunity-types";
import { buildExternalContextNarrative } from "@/lib/external-context-ask/build-external-context-narrative";
import { formatExternalEmptyReply } from "@/lib/external-context-ask/format-external-empty-reply";
import { normalizeExternalContextSources } from "@/lib/external-context-ask/normalize-external-opportunity-sources";
import {
  reasonKoForScore,
  scoreExternalOpportunity,
} from "@/lib/external-context-ask/score-external-opportunity";
import { parsePersonalContextQuery } from "@/lib/personal-context-ask/parse-personal-context-query";

const MAX_HITS = 5;

function toHit(
  row: ReturnType<typeof normalizeExternalContextSources>[number],
  score: number,
): ExternalContextOpportunityHit {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    placeLabel: row.placeLabel,
    subtitle: row.subtitle,
    bridgeKindKo: row.bridgeKindKo,
    atIso: row.atIso,
    reasonKo: reasonKoForScore(score),
    primaryCta: row.primaryCta,
    threadId: row.threadId,
    handshakeId: row.handshakeId,
    eventId: row.eventId,
    traceId: row.traceId,
    lat: row.lat,
    lng: row.lng,
  };
}

/** Pure resolve — public bridge opportunity ranking for discovery ask. */
export function resolveExternalContextAsk(input: {
  query: string;
  sources: ExternalContextSources;
  lat?: number | null;
  lng?: number | null;
  now?: Date;
}): ExternalContextAskResult {
  const now = input.now ?? new Date();
  const parsed = parsePersonalContextQuery(input.query, now);
  const intent = classifyExternalQueryIntent(input.query);
  const rows = normalizeExternalContextSources(input.sources);

  if (rows.length === 0) {
    const empty = formatExternalEmptyReply(intent);
    return {
      kind: "empty",
      intent,
      hits: [],
      narrativeKo: empty,
      summaryKo: empty,
      recommendedHitId: null,
    };
  }

  const scored = rows
    .map((row) => ({
      row,
      score: scoreExternalOpportunity({
        row,
        parsed,
        intent,
        now,
        lat: input.lat,
        lng: input.lng,
      }),
    }))
    .sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title, "ko"));

  const top = scored.slice(0, MAX_HITS);
  const hits = top.map((entry) => toHit(entry.row, entry.score));

  if (hits.length === 0) {
    const empty = formatExternalEmptyReply(intent);
    return {
      kind: "empty",
      intent,
      hits: [],
      narrativeKo: empty,
      summaryKo: empty,
      recommendedHitId: null,
    };
  }

  const narrative = buildExternalContextNarrative({
    intent,
    hits,
    parsed,
  });

  return {
    kind: "opportunities",
    intent,
    hits,
    narrativeKo: narrative.narrativeKo,
    summaryKo: narrative.summaryKo,
    recommendedHitId: hits[0]?.id ?? null,
  };
}
