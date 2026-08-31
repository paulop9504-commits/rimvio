/**
 * Reuse Before Create gate (ADR-066).
 */

import type { ReuseGateResult } from "@/lib/rimvio-index/types";
import {
  REUSE_SIMILARITY_IMPROVE,
  REUSE_SIMILARITY_REUSE,
} from "@/lib/rimvio-index/types";
import {
  queryCapabilitySemanticIndex,
  rankHitsBySimilarity,
} from "@/lib/rimvio-index/semantic-search";

export function evaluateReuseGate(input: {
  readonly utterance: string;
  readonly marketCountry?: string;
}): ReuseGateResult {
  const hits = queryCapabilitySemanticIndex({
    utterance: input.utterance,
    marketCountry: input.marketCountry,
  });
  const ranked = rankHitsBySimilarity(input.utterance, hits);
  const top = ranked[0] ?? null;
  const similarity = top?.similarity ?? 0;

  if (similarity >= REUSE_SIMILARITY_REUSE && top) {
    return {
      decision: "reuse",
      topHit: top,
      similarity,
      reasonKo: `기존 Capability 재사용 · ${top.capabilityId} (${Math.round(similarity * 100)}%)`,
      hits: ranked,
    };
  }

  if (similarity >= REUSE_SIMILARITY_IMPROVE && top) {
    return {
      decision: "improve",
      topHit: top,
      similarity,
      reasonKo: `개선 Task · ${top.capabilityId} 유사 ${Math.round(similarity * 100)}% — 신규 생성 금지`,
      hits: ranked,
    };
  }

  return {
    decision: "create",
    topHit: top,
    similarity,
    reasonKo: top
      ? `적합 Capability 없음 — Hub 개발 Task (${Math.round(similarity * 100)}%)`
      : "Registry에 매칭 Capability 없음 — Hub 개발 Task",
    hits: ranked,
  };
}
