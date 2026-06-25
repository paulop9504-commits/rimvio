import type {
  ExternalContextOpportunityHit,
  ExternalQueryIntent,
} from "@/lib/external-context-ask/external-context-opportunity-types";
import type { ParsedPersonalContextQuery } from "@/lib/personal-context-ask/personal-context-ask-types";

export type ExternalContextNarrative = {
  narrativeKo: string;
  summaryKo: string;
};

function intentLead(intent: ExternalQueryIntent, count: number): string {
  const countLabel = count === 1 ? "1건" : `${count}건`;
  switch (intent) {
    case "trade":
      return `근처에서 거래 가능한 공개 맥락 ${countLabel}을 발견했어요.`;
    case "travel":
      return `여행·동행과 맞닿은 공개 맥락 ${countLabel}을 찾았어요.`;
    case "study":
      return `공부·스터디와 맞는 공개 맥락 ${countLabel}이 있어요.`;
    case "gathering":
      return `이번 주말에 참여할 만한 공개 맥락 ${countLabel}을 발견했어요.`;
    default:
      return `밖 지구에서 연결할 공개 맥락 ${countLabel}을 찾았어요.`;
  }
}

function placeHint(parsed: ParsedPersonalContextQuery): string | null {
  return parsed.placeNeedles[0] ?? null;
}

function recommendSentence(hit: ExternalContextOpportunityHit): string {
  const place = hit.placeLabel.trim();
  if (place) {
    return `가장 적합한 맥락은 「${hit.title}」 · ${place}이에요.`;
  }
  return `가장 적합한 맥락은 「${hit.title}」이에요.`;
}

function contextTail(hit: ExternalContextOpportunityHit): string | null {
  if (hit.subtitle.trim()) {
    return `${hit.bridgeKindKo} · ${hit.subtitle}`;
  }
  return hit.bridgeKindKo;
}

/** Opportunity narrative — reason → summary → recommended hit. */
export function buildExternalContextNarrative(input: {
  intent: ExternalQueryIntent;
  hits: readonly ExternalContextOpportunityHit[];
  parsed: ParsedPersonalContextQuery;
}): ExternalContextNarrative {
  const top = input.hits[0];
  if (!top) {
    return { narrativeKo: "", summaryKo: "" };
  }

  const place = placeHint(input.parsed);
  const lead = intentLead(input.intent, input.hits.length);
  const placeLine = place ? `${place} 근처 맥락을 우선 봤어요.` : null;
  const recommend = recommendSentence(top);
  const tail = contextTail(top);

  const paragraphs = [lead, placeLine, recommend, tail].filter(
    (line): line is string => Boolean(line?.trim()),
  );

  return {
    narrativeKo: paragraphs.join("\n\n"),
    summaryKo: paragraphs[0] ?? recommend,
  };
}
