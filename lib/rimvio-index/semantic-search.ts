/**
 * Semantic Capability search — Intent → Registry (ADR-066 §Semantic Index).
 */

import { searchCapabilityIndex } from "@/lib/platform-sdk/capability-index";
import type { CapabilitySearchHit } from "@/lib/platform-sdk/capability-index";
import { jaccardSimilarity } from "@/lib/commerce/text-similarity";
import { findRelatedCapabilities } from "@/lib/rimvio-index/graph/dependency-graph";

export function queryCapabilitySemanticIndex(input: {
  readonly utterance: string;
  readonly limit?: number;
  readonly marketCountry?: string;
}): readonly CapabilitySearchHit[] {
  const utterance = input.utterance.trim();
  if (!utterance) return [];

  return searchCapabilityIndex(utterance, {
    limit: input.limit ?? 8,
    publishedOnly: true,
    marketCountry: input.marketCountry,
  });
}

/** Blend registry composite score with token overlap for reuse gate. */
export function computeCapabilitySimilarity(
  utterance: string,
  hit: CapabilitySearchHit,
): number {
  const keywordBlob = [
    hit.capabilityId,
    hit.platformName,
    hit.category,
    ...hit.tags,
    ...hit.keywords,
  ].join(" ");

  const jaccard = jaccardSimilarity(utterance, keywordBlob);
  const composite = hit.composite ?? hit.score ?? 0;
  return Math.min(1, composite * 0.55 + jaccard * 0.45);
}

export function rankHitsBySimilarity(
  utterance: string,
  hits: readonly CapabilitySearchHit[],
): readonly (CapabilitySearchHit & { readonly similarity: number })[] {
  const seedCaps = hits.slice(0, 2).map((h) => h.capabilityId);
  const related = new Set(
    seedCaps.flatMap((id) => findRelatedCapabilities({ capabilityId: id })),
  );

  return [...hits]
    .map((hit) => {
      let similarity = computeCapabilitySimilarity(utterance, hit);
      if (related.has(hit.capabilityId)) {
        similarity = Math.min(1, similarity + 0.08);
      }
      return { ...hit, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity);
}
