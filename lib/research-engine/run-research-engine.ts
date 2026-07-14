/**
 * Research Engine v1 — full 10-stage pipeline.
 * Never skips stages. Never Commits Reality.
 */

import type {
  ResearchResult,
  ResearchStage,
} from "@/engines/research/schema";
import { RESEARCH_ENGINE_VERSION, RESEARCH_STAGES } from "@/engines/research/schema";
import { compileIntentBlueprint } from "@/lib/intent-engine/compile-intent-blueprint";
import type { IntentBlueprint } from "@/lib/intent-engine/types";
import { buildResearchPlan } from "@/lib/research-engine/build-research-plan";
import { generateResearchDecision, scoreResearchConfidence } from "@/lib/research-engine/decision";
import { deepResearchTopCandidates } from "@/lib/research-engine/deep-research";
import { expandResearchQueries } from "@/lib/research-engine/expand-queries";
import { annotateFastScan } from "@/lib/research-engine/fast-scan";
import { mergeResearchEvidence } from "@/lib/research-engine/merge-evidence";
import { researchStageProgressKo } from "@/lib/research-engine/progress-copy";
import type { ResearchCandidateProvider } from "@/lib/research-engine/providers";
import { rankResearchCandidates } from "@/lib/research-engine/rank-candidates";

export type RunResearchEngineInput = {
  text: string;
  blueprint?: IntentBlueprint | null;
  provider: ResearchCandidateProvider;
  topKDeep?: number;
  onStage?: (stage: ResearchStage, progressKo: string) => void;
};

function emit(
  onStage: RunResearchEngineInput["onStage"],
  stage: ResearchStage,
  trace: ResearchStage[],
): void {
  trace.push(stage);
  onStage?.(stage, researchStageProgressKo(stage));
}

export async function runResearchEngine(
  input: RunResearchEngineInput,
): Promise<ResearchResult> {
  const text = input.text.trim();
  const stageTrace: ResearchStage[] = [];
  const onStage = input.onStage;

  // Stage 1
  emit(onStage, "UNDERSTAND_INTENT", stageTrace);
  const blueprint =
    input.blueprint ?? (text ? compileIntentBlueprint({ text }) : null);
  const intentSummaryKo = blueprint
    ? `의도: ${blueprint.intents.map((i) => i.labelKo).join(" · ") || "일반 조사"} (conf ${(blueprint.confidence * 100).toFixed(0)}%)`
    : text
      ? `의도(원시): ${text.slice(0, 80)}`
      : "의도 불명";

  // Stage 2
  emit(onStage, "EXPAND_SEARCH_QUERY", stageTrace);
  const expandedQueries = expandResearchQueries({ text, blueprint });

  // Stage 3
  emit(onStage, "BUILD_RESEARCH_PLAN", stageTrace);
  const researchPlan = buildResearchPlan(expandedQueries);

  // Stage 4
  emit(onStage, "FAST_SCAN", stageTrace);
  const raw = await Promise.resolve(
    input.provider.listCandidates({
      queries: expandedQueries,
      limit: 32,
    }),
  );
  const scanned = annotateFastScan(raw, expandedQueries);

  // Stage 5
  emit(onStage, "CANDIDATE_RANKING", stageTrace);
  const ranked = rankResearchCandidates({
    candidates: scanned,
    blueprint,
  });

  // Stage 6
  emit(onStage, "DEEP_RESEARCH", stageTrace);
  const deepExtracts = deepResearchTopCandidates(
    ranked,
    input.topKDeep ?? 5,
  );

  // Stage 7
  emit(onStage, "EVIDENCE_MERGE", stageTrace);
  const evidence = mergeResearchEvidence({
    extracts: deepExtracts,
    ranked,
  });

  // Stage 8 (explicit; merge already collected conflicts)
  emit(onStage, "CONFLICT_DETECTION", stageTrace);

  // Stage 9
  emit(onStage, "CONFIDENCE_SCORING", stageTrace);
  const confidence = scoreResearchConfidence({
    evidence,
    ranked,
    extracts: deepExtracts,
  });

  // Stage 10
  emit(onStage, "DECISION_GENERATION", stageTrace);
  const decision = generateResearchDecision({
    ranked,
    extracts: deepExtracts,
    evidence,
    confidence,
  });

  if (stageTrace.length !== RESEARCH_STAGES.length) {
    throw new Error(
      `research_stages_skipped: got ${stageTrace.length} expected ${RESEARCH_STAGES.length}`,
    );
  }

  const kept = ranked.filter((r) => !r.rejected).slice(0, 8);
  const sourcesUsed = kept.map((r) => ({
    id: r.candidate.id,
    title: r.candidate.title,
    domain: r.candidate.domain,
  }));

  const evidenceSummaryKo = [
    `공통 사실 ${evidence.commonFacts.length}건`,
    `충돌 ${evidence.conflictingFacts.length}건`,
    `일관성 ${(evidence.consistencyScore * 100).toFixed(0)}%`,
    decision.evidenceWeak ? "증거 약함" : "증거 충분 쪽",
  ].join(" · ");

  const nextActions = [
    {
      id: "rescout",
      labelKo: "비슷한 후보 더 보기",
      seedUtterance: text || "비슷한 후보 더 찾아줘",
    },
    {
      id: "narrow",
      labelKo: "조건 좁히기",
      seedUtterance: "가격이랑 위치 조건 더 말해줄게",
    },
  ];
  if (decision.best.candidateId) {
    nextActions.unshift({
      id: "focus_best",
      labelKo: "추천 후보 자세히",
      seedUtterance: `${decision.best.title} 자세히 알려줘`,
    });
  }

  return {
    version: RESEARCH_ENGINE_VERSION,
    intentSummaryKo,
    researchPlan,
    evidenceSummaryKo,
    confidence,
    decision,
    sourcesUsed,
    nextActions,
    stageTrace,
    evidence,
    ranked,
    deepExtracts,
    expandedQueries,
  };
}

/** Format ResearchResult for Globe compose text (not a new UI surface). */
export function formatResearchResultComposeKo(result: ResearchResult): string {
  const lines = [
    result.intentSummaryKo,
    `신뢰도 ${(result.confidence * 100).toFixed(0)}%${result.decision.evidenceWeak ? " — 증거가 약합니다" : ""}`,
    `추천: ${result.decision.best.title}`,
    result.decision.whyKo,
  ];
  if (result.decision.alternative) {
    lines.push(`대안: ${result.decision.alternative.title}`);
  }
  if (result.decision.tradeoffsKo[0]) {
    lines.push(`트레이드오프: ${result.decision.tradeoffsKo[0]}`);
  }
  if (result.sourcesUsed.length > 0) {
    lines.push(
      `출처: ${result.sourcesUsed
        .slice(0, 4)
        .map((s) => s.domain)
        .join(", ")}`,
    );
  }
  lines.push(result.evidenceSummaryKo);
  return lines.filter(Boolean).join("\n");
}
