import type {
  EvidenceMerge,
  RankedCandidate,
  ResearchDecision,
} from "@/engines/research/schema";
import type { DeepResearchExtract } from "@/engines/research/schema";

/** Stage 9 — confidence from multi-source agreement, freshness proxy, conflicts. */
export function scoreResearchConfidence(input: {
  evidence: EvidenceMerge;
  ranked: readonly RankedCandidate[];
  extracts: readonly DeepResearchExtract[];
}): number {
  const kept = input.ranked.filter((r) => !r.rejected);
  const domains = new Set(kept.map((r) => r.candidate.domain));
  let score = input.evidence.consistencyScore * 0.55;
  if (domains.size >= 3) {
    score += 0.2;
  } else if (domains.size >= 2) {
    score += 0.12;
  } else {
    score -= 0.15;
  }
  const weakRatio =
    input.extracts.length === 0
      ? 1
      : input.extracts.filter((e) => e.weakExtract).length / input.extracts.length;
  score -= weakRatio * 0.2;
  score -= Math.min(0.3, input.evidence.conflictingFacts.length * 0.1);
  if (kept.length === 0) {
    score = Math.min(score, 0.15);
  }
  return Math.max(0.05, Math.min(0.95, score));
}

/** Stage 10 — prepared recommendation only (no Reality Commit). */
export function generateResearchDecision(input: {
  ranked: readonly RankedCandidate[];
  extracts: readonly DeepResearchExtract[];
  evidence: EvidenceMerge;
  confidence: number;
}): ResearchDecision {
  const kept = input.ranked.filter((r) => !r.rejected);
  const best = kept[0] ?? null;
  const alt = kept[1] ?? null;
  const evidenceWeak =
    input.confidence < 0.45 ||
    input.evidence.consistencyScore < 0.35 ||
    kept.length < 2;

  const bestExtract = input.extracts.find((e) => e.candidateId === best?.candidate.id);
  const whyParts: string[] = [];
  if (best) {
    whyParts.push(`독립 스캔·순위 기준으로 「${best.candidate.title}」이(가) 앞섰습니다`);
  }
  if (input.evidence.commonFacts.length > 0) {
    whyParts.push(
      `공통 사실 ${input.evidence.commonFacts.length}건이 여러 출처에서 맞았습니다`,
    );
  }
  if (evidenceWeak) {
    whyParts.push("증거가 약해 추천 확신은 낮습니다");
  }

  const tradeoffsKo: string[] = [];
  if (alt) {
    tradeoffsKo.push(
      `대안 「${alt.candidate.title}」은 순위·축에서 차순위입니다`,
    );
  }
  if (bestExtract?.cons[0]) {
    tradeoffsKo.push(bestExtract.cons[0]);
  }
  if (input.evidence.conflictingFacts[0]) {
    const c = input.evidence.conflictingFacts[0];
    tradeoffsKo.push(`충돌: ${c.claimA} vs ${c.claimB}`);
  }

  const risksKo: string[] = [...input.evidence.missingFacts];
  for (const w of bestExtract?.warnings ?? []) {
    risksKo.push(w);
  }
  if (evidenceWeak) {
    risksKo.push("단일·약한 증거에 의존하면 환각 위험이 큽니다");
  }

  return {
    best: {
      title: best?.candidate.title ?? "추천 후보 없음",
      candidateId: best?.candidate.id ?? null,
      summaryKo: evidenceWeak
        ? "증거 부족 — 아래 후보를 준비만 했습니다. Reality Commit은 하지 않습니다."
        : `${best?.candidate.snippet.slice(0, 120) ?? ""}`.trim() ||
          "다출처 순위에서 1위 후보입니다.",
    },
    alternative: alt
      ? {
          title: alt.candidate.title,
          candidateId: alt.candidate.id,
          summaryKo: alt.candidate.snippet.slice(0, 120) || "차순위 후보",
        }
      : null,
    whyKo: whyParts.join(". ") || "조사 단계만 완료했습니다.",
    tradeoffsKo,
    risksKo,
    confidence: input.confidence,
    evidenceWeak,
  };
}
