import type {
  DeepResearchExtract,
  EvidenceMerge,
  RankedCandidate,
} from "@/engines/research/schema";

function normalizeClaim(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

/**
 * Stages 7–8 — merge facts; detect conflicts; never average opinions.
 */
export function mergeResearchEvidence(input: {
  extracts: readonly DeepResearchExtract[];
  ranked: readonly RankedCandidate[];
}): EvidenceMerge {
  const byClaim = new Map<
    string,
    { claim: string; sourceIds: Set<string>; conf: number[] }
  >();

  for (const ex of input.extracts) {
    for (const fact of [...ex.facts, ...ex.numbers]) {
      const key = normalizeClaim(fact);
      if (!key) {
        continue;
      }
      const prev = byClaim.get(key) ?? {
        claim: fact,
        sourceIds: new Set<string>(),
        conf: [] as number[],
      };
      prev.sourceIds.add(ex.candidateId);
      prev.conf.push(ex.weakExtract ? 0.35 : 0.7);
      byClaim.set(key, prev);
    }
  }

  const commonFacts = [];
  const lowConfidenceFacts = [];
  for (const row of byClaim.values()) {
    const confidence =
      row.conf.reduce((a, b) => a + b, 0) / Math.max(1, row.conf.length);
    const bucket = {
      claim: row.claim,
      sourceIds: [...row.sourceIds],
      confidence: Math.min(1, confidence + (row.sourceIds.size > 1 ? 0.15 : 0)),
    };
    if (row.sourceIds.size >= 2) {
      commonFacts.push(bucket);
    } else if (bucket.confidence < 0.55) {
      lowConfidenceFacts.push(bucket);
    } else {
      lowConfidenceFacts.push(bucket);
    }
  }

  // Price conflicts across sources
  const priceBySource = new Map<string, number>();
  for (const ranked of input.ranked) {
    if (ranked.rejected) {
      continue;
    }
    const p = ranked.candidate.metadata?.priceKrw;
    if (typeof p === "number" && Number.isFinite(p)) {
      priceBySource.set(ranked.candidate.id, p);
    }
  }
  const conflictingFacts: {
    claimA: string;
    claimB: string;
    sourceIdsA: string[];
    sourceIdsB: string[];
  }[] = [];
  const prices = [...priceBySource.entries()];
  for (let i = 0; i < prices.length; i += 1) {
    for (let j = i + 1; j < prices.length; j += 1) {
      const [idA, pa] = prices[i]!;
      const [idB, pb] = prices[j]!;
      const mid = (pa + pb) / 2;
      if (mid > 0 && Math.abs(pa - pb) / mid > 0.35) {
        conflictingFacts.push({
          claimA: `가격 ${Math.round(pa)}원`,
          claimB: `가격 ${Math.round(pb)}원`,
          sourceIdsA: [idA],
          sourceIdsB: [idB],
        });
      }
    }
  }

  const domains = new Set(
    input.ranked.filter((r) => !r.rejected).map((r) => r.candidate.domain),
  );
  const multiSource = domains.size >= 2;
  const agreement =
    commonFacts.length > 0
      ? Math.min(1, 0.45 + commonFacts.length * 0.12 + (multiSource ? 0.2 : 0))
      : multiSource
        ? 0.4
        : 0.22;
  const conflictPenalty = Math.min(0.45, conflictingFacts.length * 0.15);
  const consistencyScore = Math.max(0.05, agreement - conflictPenalty);

  const missingFacts: string[] = [];
  if (prices.length === 0) {
    missingFacts.push("확인된 가격 정보가 부족합니다");
  }
  if (input.extracts.every((e) => e.weakExtract)) {
    missingFacts.push("심층 추출에 쓸 스니펫이 약합니다");
  }
  if (domains.size < 2) {
    missingFacts.push("독립 출처가 2곳 미만입니다");
  }

  return {
    commonFacts,
    conflictingFacts,
    missingFacts,
    lowConfidenceFacts,
    consistencyScore,
  };
}
