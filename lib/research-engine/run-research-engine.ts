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
import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import type { PersuasionContext } from "@/lib/research-engine/score-persuasion";
import {
  resolveInitialResearchStrategy,
  resolveNextResearchStrategy,
  researchStrategyLabelKo,
  RESEARCH_STRATEGY_MAX_SWITCHES,
  type ResearchStrategyId,
  type ResearchStrategyStep,
} from "@/lib/research-engine/research-strategy";
import { runResearchSurgicalLoop } from "@/lib/research-engine/tools/run-research-surgical-loop";
import type { ResearchGapRetryStep } from "@/lib/research-engine/tools/run-research-surgical-loop";
import type { ResearchToolRuntime } from "@/lib/research-engine/tools/types";
import type { ResearchToolCall } from "@/lib/research-engine/tools/types";
import {
  buildResearchEvidenceCards,
} from "@/lib/research-engine/tools/build-evidence-cards";
import {
  formatMultiSectorResultsKo,
  isMultiSectorResearch,
  resolveResearchSectors,
  runMultiSectorResearchSurgery,
  type ResearchSectorResult,
} from "@/lib/research-engine/multi-sector-surgery";
import { buildResearchApprovalGate } from "@/lib/research-engine/build-research-approval-gate";

export type RunResearchEngineInput = {
  text: string;
  blueprint?: IntentBlueprint | null;
  provider: ResearchCandidateProvider;
  topKDeep?: number;
  onStage?: (stage: ResearchStage, progressKo: string) => void;
  /** Anchor for distance axis (optional). */
  anchorLat?: number | null;
  anchorLng?: number | null;
  /** Override budget; default parsed from text. */
  maxNightlyPriceKrw?: number | null;
  /** Surgical tool runtime (Places / LiteAPI / YT). */
  toolRuntime?: ResearchToolRuntime;
  /** Max surgical rounds (default 4). */
  surgicalMaxRounds?: number;
  onTool?: (summaryKo: string) => void;
  /** Force starting lens (tests). */
  strategy?: ResearchStrategyId;
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
  let ranked = rankResearchCandidates({
    candidates: scanned,
    blueprint,
  });

  // Stage 6
  emit(onStage, "DEEP_RESEARCH", stageTrace);
  const maxNightly =
    input.maxNightlyPriceKrw ?? parseMaxNightlyPriceKrw(text);
  const persuasionContext: PersuasionContext = {
    message: text,
    maxNightlyPriceKrw: maxNightly,
    anchorLat: input.anchorLat ?? null,
    anchorLng: input.anchorLng ?? null,
  };

  let strategy: ResearchStrategyId =
    input.strategy ??
    resolveInitialResearchStrategy({
      message: text,
      maxNightlyPriceKrw: maxNightly,
      hasAnchor:
        input.anchorLat != null && input.anchorLng != null,
    });
  const strategyTrace: ResearchStrategyStep[] = [
    {
      strategy,
      reasonKo: `수술 렌즈: ${researchStrategyLabelKo(strategy)}`,
      switched: false,
    },
  ];
  const triedStrategies = new Set<ResearchStrategyId>([strategy]);
  onStage?.(
    "DEEP_RESEARCH",
    `› 수술 렌즈 «${researchStrategyLabelKo(strategy)}»`,
  );

  const onSurgicalTool = (call: ResearchToolCall) => {
    const evidenceLine = call.evidence
      ? `Called ${call.evidence.called} → ${call.status === "ok" ? `got ${call.evidence.gotLine}` : `skip (${call.evidence.gotLine})`}`
      : `${call.toolId} ${call.status === "ok" ? "✓" : call.status === "skip" ? "–" : "!"} ${call.summaryKo}`;
    input.onTool?.(evidenceLine);
    onStage?.("DEEP_RESEARCH", `› ${evidenceLine}`);
  };
  const onGapRetry = (step: ResearchGapRetryStep) => {
    input.onTool?.(step.summaryKo);
    onStage?.("DEEP_RESEARCH", `› ${step.summaryKo}`);
  };

  let toolTrace: ResearchToolCall[] = [];
  let gapRetryTrace: ResearchGapRetryStep[] = [];
  let sectorResults: ResearchSectorResult[] = [];
  let deepExtracts = deepResearchTopCandidates(
    ranked,
    input.topKDeep ?? 5,
  );
  let evidence = mergeResearchEvidence({
    extracts: deepExtracts,
    ranked,
  });
  let confidence = 0;

  const multiSector = isMultiSectorResearch({ message: text, ranked });
  if (multiSector) {
    onStage?.(
      "DEEP_RESEARCH",
      `› 멀티 섹터 수술 «${resolveResearchSectors({ message: text, ranked })
        .map((s) => s)
        .join(" · ")}»`,
    );
  }

  // Cursor-like: weak evidence → switch surgical lens and re-pick (max N).
  for (
    let pass = 0;
    pass <= RESEARCH_STRATEGY_MAX_SWITCHES;
    pass += 1
  ) {
    const sectors = resolveResearchSectors({ message: text, ranked });
    const useMulti = sectors.length >= 2;

    if (useMulti) {
      const multi = await runMultiSectorResearchSurgery({
        ranked,
        persuasionContext,
        sectors,
        strategy,
        runtime: input.toolRuntime,
        maxRoundsPerSector: Math.min(3, input.surgicalMaxRounds ?? 3),
        onTool: onSurgicalTool,
        onGapRetry,
        onSector: (_sector, summaryKo) => {
          input.onTool?.(summaryKo);
          onStage?.("DEEP_RESEARCH", summaryKo);
        },
      });
      ranked = [...multi.ranked];
      toolTrace = [...toolTrace, ...multi.toolTrace];
      gapRetryTrace = [...gapRetryTrace, ...multi.gapRetryTrace];
      sectorResults = [...multi.sectorResults];
      deepExtracts = deepResearchTopCandidates(
        ranked,
        input.topKDeep ?? 5,
      );
      evidence = mergeResearchEvidence({
        extracts: deepExtracts,
        ranked,
      });
      const blend = scoreResearchConfidence({
        evidence,
        ranked,
        extracts: deepExtracts,
        persuasionContext,
      });
      // Prefer mean of sector 납득 when multi-sector.
      confidence = Math.round(((multi.confidence * 0.7 + blend * 0.3) * 1000)) / 1000;
    } else {
      const surgical = await runResearchSurgicalLoop({
        ranked,
        persuasionContext,
        maxRounds: input.surgicalMaxRounds ?? 5,
        runtime: input.toolRuntime,
        strategy,
        resetTried: pass > 0,
        onTool: onSurgicalTool,
        onGapRetry,
      });
      ranked = [...surgical.ranked];
      toolTrace = [...toolTrace, ...surgical.toolTrace];
      gapRetryTrace = [...gapRetryTrace, ...surgical.gapRetryTrace];
      sectorResults = [];
      deepExtracts = deepResearchTopCandidates(
        ranked,
        input.topKDeep ?? 5,
      );
      evidence = mergeResearchEvidence({
        extracts: deepExtracts,
        ranked,
      });
      confidence = scoreResearchConfidence({
        evidence,
        ranked,
        extracts: deepExtracts,
        persuasionContext,
      });
    }

    if (pass >= RESEARCH_STRATEGY_MAX_SWITCHES) {
      break;
    }

    const nextLens = resolveNextResearchStrategy({
      current: strategy,
      message: text,
      maxNightlyPriceKrw: maxNightly,
      hasAnchor: input.anchorLat != null && input.anchorLng != null,
      confidence,
      ranked,
      persuasionContext,
      toolTrace: toolTrace.slice(-8),
      triedStrategies,
      switchCount: strategyTrace.filter((s) => s.switched).length,
      maxSwitches: RESEARCH_STRATEGY_MAX_SWITCHES,
    });
    if (!nextLens) {
      break;
    }

    strategy = nextLens.strategy;
    triedStrategies.add(strategy);
    strategyTrace.push(nextLens);
    onStage?.("DEEP_RESEARCH", `› ${nextLens.reasonKo}`);
  }

  // Stage 7–9 already reflected above; emit for timeline completeness.
  emit(onStage, "EVIDENCE_MERGE", stageTrace);
  emit(onStage, "CONFLICT_DETECTION", stageTrace);
  emit(onStage, "CONFIDENCE_SCORING", stageTrace);

  // Stage 10
  emit(onStage, "DECISION_GENERATION", stageTrace);
  let decision = generateResearchDecision({
    ranked,
    extracts: deepExtracts,
    evidence,
    confidence,
    persuasionContext,
  });
  if (sectorResults.length >= 2) {
    const sectorWhy = sectorResults
      .filter((s) => s.bestCandidateId)
      .map((s) => s.summaryKo)
      .join(" · ");
    decision = {
      ...decision,
      whyKo: [sectorWhy, decision.whyKo].filter(Boolean).join(". "),
      best: {
        ...decision.best,
        summaryKo:
          sectorResults
            .filter((s) => s.bestCandidateId)
            .map((s) => `${s.labelKo} ${s.bestTitle}`)
            .join(" · ") || decision.best.summaryKo,
      },
    };
  }

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
    `납득 신호 ${decision.whyKo.split(". ").length}줄`,
    `공통 사실 ${evidence.commonFacts.length}건`,
    `충돌 ${evidence.conflictingFacts.length}건`,
    `일관성 ${(evidence.consistencyScore * 100).toFixed(0)}%`,
    decision.evidenceWeak ? "교차검증 약함" : "신호 충분 쪽",
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

  const evidenceCards = buildResearchEvidenceCards({
    toolTrace,
    ranked,
  });

  const approvalBuilt = buildResearchApprovalGate({
    confidence,
    evidenceWeak: decision.evidenceWeak,
    bestTitle: decision.best.title,
    bestCandidateId: decision.best.candidateId,
    sectorSummariesKo: sectorResults.map((s) => s.summaryKo),
  });

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
    toolTrace: toolTrace.map((call) => ({
      toolId: call.toolId,
      candidateId: call.candidateId,
      status: call.status,
      summaryKo: call.summaryKo,
      evidence: call.evidence
        ? {
            called: call.evidence.called,
            args: call.evidence.args,
            got: call.evidence.got,
            gotLine: call.evidence.gotLine,
          }
        : null,
    })),
    evidenceCards: evidenceCards.map((card) => ({
      toolId: card.toolId,
      status: card.status,
      called: card.called,
      gotLine: card.gotLine,
      lineKo: card.lineKo,
    })),
    gapRetryTrace: gapRetryTrace.map((step) => ({
      missing: step.missing,
      missingKey: step.missingKey,
      toolId: step.toolId,
      status: step.status,
      closedFields: [...step.closedFields],
      persuasionBefore: step.persuasionBefore,
      persuasionAfter: step.persuasionAfter,
      summaryKo: step.summaryKo,
    })),
    strategyTrace: strategyTrace.map((step) => ({
      strategy: step.strategy,
      reasonKo: step.reasonKo,
    })),
    sectorResults:
      sectorResults.length >= 2
        ? sectorResults.map((s) => ({
            sector: s.sector,
            labelKo: s.labelKo,
            bestTitle: s.bestTitle,
            bestCandidateId: s.bestCandidateId,
            confidence: s.confidence,
            headlineKo: s.headlineKo,
            summaryKo: s.summaryKo,
          }))
        : undefined,
    approvalGate: approvalBuilt
      ? {
          status: "waiting_approval" as const,
          promptKo: approvalBuilt.promptKo,
          offerApply: approvalBuilt.offerApply,
          chips: approvalBuilt.chips.map((c) => ({ ...c })),
        }
      : undefined,
  };
}

/** Format ResearchResult for Globe compose text (not a new UI surface). */
export function formatResearchResultComposeKo(result: ResearchResult): string {
  const confPct = Math.round(result.confidence * 100);
  const lines = [
    result.intentSummaryKo,
    `납득도 ${confPct}${result.decision.evidenceWeak ? " — 신호 적음, 아래 근거 위주" : ""}${
      (result.sectorResults?.length ?? 0) >= 2 ? " · 멀티 섹터" : ""
    }`,
    result.decision.best.summaryKo
      ? `근거: ${result.decision.best.summaryKo}`
      : "",
    (result.sectorResults?.length ?? 0) >= 2
      ? `추천: ${result.sectorResults!
          .filter((s) => s.bestCandidateId)
          .map((s) => `${s.labelKo} ${s.bestTitle}`)
          .join(" · ")}`
      : `추천: ${result.decision.best.title}`,
    `왜: ${result.decision.whyKo}`,
  ];
  if ((result.sectorResults?.length ?? 0) >= 2) {
    lines.push(formatMultiSectorResultsKo(result.sectorResults!));
  }
  if (result.decision.alternative) {
    lines.push(
      `대안: ${result.decision.alternative.title} — ${result.decision.alternative.summaryKo}`,
    );
  }
  if (result.decision.tradeoffsKo[0]) {
    lines.push(`참고: ${result.decision.tradeoffsKo[0]}`);
  }
  if (result.sourcesUsed.length > 0) {
    const labels = result.sourcesUsed.slice(0, 4).map((s) => {
      if (/rimvio/iu.test(s.domain)) {
        return s.title;
      }
      return s.domain;
    });
    lines.push(`근거 후보: ${labels.join(" · ")}`);
  }
  const tools = result.toolTrace ?? [];
  if (tools.length > 0) {
    lines.push(
      `수술 도구: ${tools
        .map((t) => {
          const mark =
            t.status === "ok" ? "✓" : t.status === "skip" ? "–" : "!";
          return `${t.toolId} ${mark}`;
        })
        .join(" → ")}`,
    );
  }
  if ((result.evidenceCards?.length ?? 0) > 0) {
    lines.push(
      ["증거 카드:", ...result.evidenceCards!.map((c) => `• ${c.lineKo}`)].join(
        "\n",
      ),
    );
  }
  const gapRetries = result.gapRetryTrace ?? [];
  if (gapRetries.length > 0) {
    lines.push(
      `갭 재시도: ${gapRetries
        .map((s) => {
          const mark =
            s.status === "ok" ? "✓" : s.status === "skip" ? "–" : "!";
          return `${s.missingKey}→${s.toolId}${mark}`;
        })
        .join(" → ")}`,
    );
  }
  if ((result.strategyTrace?.length ?? 0) > 0) {
    const switches = result.strategyTrace!.filter((s) =>
      /전환/.test(s.reasonKo),
    ).length;
    lines.push(
      `렌즈: ${result.strategyTrace!.map((s) => s.reasonKo).join(" → ")}${
        switches > 0 ? ` · 전환 ${switches}회` : ""
      }`,
    );
  }
  if (result.approvalGate) {
    lines.push(result.approvalGate.promptKo);
    lines.push(
      `승인: ${result.approvalGate.chips.map((c) => c.labelKo).join(" · ")}`,
    );
  }
  lines.push(result.evidenceSummaryKo);
  return lines.filter(Boolean).join("\n");
}
