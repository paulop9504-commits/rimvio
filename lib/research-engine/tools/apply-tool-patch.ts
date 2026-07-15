import type { FastScanCandidate, RankedCandidate } from "@/engines/research/schema";
import type { ResearchToolPatch } from "@/lib/research-engine/tools/types";

function mergeMetadata(
  base: FastScanCandidate["metadata"],
  patch: ResearchToolPatch["metadata"],
): FastScanCandidate["metadata"] {
  return {
    ...(base ?? {}),
    ...(patch ?? {}),
  };
}

export function applyResearchToolPatch(input: {
  ranked: readonly RankedCandidate[];
  candidateId: string;
  patch: ResearchToolPatch;
}): RankedCandidate[] {
  return input.ranked.map((row) => {
    if (row.candidate.id !== input.candidateId) {
      return row;
    }
    const c = row.candidate;
    const snippetAppend = input.patch.snippetAppend?.trim();
    const nextSnippet =
      snippetAppend && !c.snippet.includes(snippetAppend)
        ? `${c.snippet} · ${snippetAppend}`.trim()
        : c.snippet;
    const next: FastScanCandidate = {
      ...c,
      reviewCount:
        input.patch.reviewCount != null
          ? input.patch.reviewCount
          : c.reviewCount,
      popularity:
        input.patch.popularity != null
          ? input.patch.popularity
          : c.popularity,
      snippet: nextSnippet,
      metadata: mergeMetadata(c.metadata, input.patch.metadata),
    };
    return { ...row, candidate: next };
  });
}
