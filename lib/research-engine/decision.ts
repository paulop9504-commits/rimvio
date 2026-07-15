import type {
  EvidenceMerge,
  RankedCandidate,
  ResearchDecision,
} from "@/engines/research/schema";
import type { DeepResearchExtract } from "@/engines/research/schema";
import {
  scoreResearchPersuasion,
  type PersuasionContext,
} from "@/lib/research-engine/score-persuasion";

/**
 * Stage 9 — 납득도 = 5-axis persuasion (primary) + light consistency blend.
 * Missing axes do not tank the score (renormalized in persuasion).
 */
export function scoreResearchConfidence(input: {
  evidence: EvidenceMerge;
  ranked: readonly RankedCandidate[];
  extracts: readonly DeepResearchExtract[];
  persuasionContext?: PersuasionContext;
}): number {
  const kept = input.ranked.filter((r) => !r.rejected);
  if (kept.length === 0) {
    return 0.08;
  }
  const persuasion = scoreResearchPersuasion(
    input.ranked,
    input.persuasionContext,
  ).score;
  // Light consistency spice only — never dominate (fixtures used to crush this).
  const consistencyBoost = Math.min(
    0.08,
    Math.max(0, input.evidence.consistencyScore - 0.35) * 0.2,
  );
  const conflictCut = Math.min(
    0.08,
    input.evidence.conflictingFacts.length * 0.04,
  );
  return Math.max(
    0.08,
    Math.min(0.95, persuasion + consistencyBoost - conflictCut),
  );
}

/** Stage 10 — prepared recommendation only (no Reality Commit). */
export function generateResearchDecision(input: {
  ranked: readonly RankedCandidate[];
  extracts: readonly DeepResearchExtract[];
  evidence: EvidenceMerge;
  confidence: number;
  persuasionContext?: PersuasionContext;
}): ResearchDecision {
  const kept = input.ranked.filter((r) => !r.rejected);
  const best = kept[0] ?? null;
  const alt = kept[1] ?? null;
  const persuasion = scoreResearchPersuasion(
    input.ranked,
    input.persuasionContext,
  );
  const strongAxes = persuasion.axes.filter(
    (axis) => axis.available && axis.score >= 0.4,
  );
  const evidenceWeak =
    input.confidence < 0.42 && strongAxes.length < 2;

  const bestExtract = input.extracts.find(
    (e) => e.candidateId === best?.candidate.id,
  );
  const whyParts: string[] = [...persuasion.bulletsKo];
  if (best && whyParts.length === 0) {
    whyParts.push(`순위 기준으로 「${best.candidate.title}」이(가) 앞섰습니다`);
  }
  if (input.evidence.commonFacts.length > 0) {
    whyParts.push(
      `공통 사실 ${input.evidence.commonFacts.length}건이 여러 출처에서 맞았습니다`,
    );
  }
  if (evidenceWeak) {
    whyParts.push("관측 신호가 적어, 아래 있는 근거만 우선 보세요");
  }

  const tradeoffsKo: string[] = [];
  if (alt) {
    tradeoffsKo.push(
      `대안 「${alt.candidate.title}」— ${alt.candidate.snippet.slice(0, 60) || "차순위"}`,
    );
  }
  if (bestExtract?.cons[0]) {
    tradeoffsKo.push(bestExtract.cons[0]);
  }
  if (input.evidence.conflictingFacts[0]) {
    const c = input.evidence.conflictingFacts[0];
    tradeoffsKo.push(`같은 장소 가격 표기 충돌: ${c.claimA} vs ${c.claimB}`);
  }

  const risksKo: string[] = [...input.evidence.missingFacts];
  for (const w of bestExtract?.warnings ?? []) {
    risksKo.push(w);
  }

  return {
    best: {
      title: best?.candidate.title ?? "추천 후보 없음",
      candidateId: best?.candidate.id ?? null,
      summaryKo:
        persuasion.headlineKo ||
        best?.candidate.snippet.slice(0, 140).trim() ||
        (evidenceWeak
          ? "후보를 준비했습니다. Reality Commit은 하지 않습니다."
          : "납득 신호 기준으로 1위 후보입니다."),
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
