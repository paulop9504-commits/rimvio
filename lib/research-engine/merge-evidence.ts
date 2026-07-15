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

function normalizePlaceKey(title: string, id: string): string {
  const t = title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
  return t || id;
}

/**
 * Stages 7–8 — merge facts; detect conflicts; never average opinions.
 * Different candidates' different prices are NOT conflicts.
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
    } else {
      lowConfidenceFacts.push(bucket);
    }
  }

  // Same placeKey / placeId / title only — never treat A vs B hotel prices as conflict.
  const priceByPlace = new Map<string, { id: string; price: number }[]>();
  for (const ranked of input.ranked) {
    // Include duplicate-rejected rows — they may be the same place from another source.
    const p = ranked.candidate.metadata?.priceKrw;
    if (typeof p !== "number" || !Number.isFinite(p)) {
      continue;
    }
    const metaKey =
      (typeof ranked.candidate.metadata?.placeKey === "string" &&
        ranked.candidate.metadata.placeKey.trim()) ||
      (typeof ranked.candidate.metadata?.placeId === "string" &&
        ranked.candidate.metadata.placeId.trim()) ||
      "";
    const placeKey =
      metaKey ||
      normalizePlaceKey(ranked.candidate.title, ranked.candidate.id);
    const list = priceByPlace.get(placeKey) ?? [];
    list.push({ id: ranked.candidate.id, price: p });
    priceByPlace.set(placeKey, list);
  }
  const conflictingFacts: {
    claimA: string;
    claimB: string;
    sourceIdsA: string[];
    sourceIdsB: string[];
  }[] = [];
  for (const entries of priceByPlace.values()) {
    if (entries.length < 2) {
      continue;
    }
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i]!;
        const b = entries[j]!;
        const mid = (a.price + b.price) / 2;
        if (mid > 0 && Math.abs(a.price - b.price) / mid > 0.35) {
          conflictingFacts.push({
            claimA: `가격 ${Math.round(a.price)}원`,
            claimB: `가격 ${Math.round(b.price)}원`,
            sourceIdsA: [a.id],
            sourceIdsB: [b.id],
          });
        }
      }
    }
  }

  const domains = new Set(
    input.ranked.filter((r) => !r.rejected).map((r) => r.candidate.domain),
  );
  const multiSource = domains.size >= 2;
  const hasPersuasiveInventory = [...domains].some((d) =>
    /(?:\.rimvio$|inventory\.|discovery\.)/iu.test(d),
  );
  const agreement =
    commonFacts.length > 0
      ? Math.min(1, 0.45 + commonFacts.length * 0.12 + (multiSource ? 0.2 : 0))
      : multiSource
        ? 0.45
        : hasPersuasiveInventory
          ? 0.42
          : 0.28;
  const conflictPenalty = Math.min(0.45, conflictingFacts.length * 0.15);
  const consistencyScore = Math.max(0.05, agreement - conflictPenalty);

  const missingFacts: string[] = [];
  const priced = [...priceByPlace.values()].some((rows) => rows.length > 0);
  if (!priced) {
    missingFacts.push("확인된 가격 정보가 부족합니다");
  }
  if (input.extracts.every((e) => e.weakExtract) && input.extracts.length > 0) {
    missingFacts.push("심층 추출에 쓸 스니펫이 약합니다");
  }
  if (domains.size < 2 && !hasPersuasiveInventory) {
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
