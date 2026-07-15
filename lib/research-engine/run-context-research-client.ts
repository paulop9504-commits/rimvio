"use client";

/**
 * Client entry — research-worthy utter → live Narrator stream + runResearchEngine.
 * Streams tool/gap/lens/rescore lines as they happen. Does not Commit Reality.
 */

import {
  appendContextAgentComposeTurn,
  appendOperatorAskChipsComposeTurn,
  readContextAgentComposeThread,
} from "@/lib/globe/assistant/context-agent-compose-thread-store";
import {
  completeScoutNarration,
  publishScoutNarration,
  publishScoutNarrationLiveStep,
} from "@/lib/globe/narrator-engine/publish-scout-narration";
import type { ScoutNarration } from "@/lib/globe/narrator-engine/types";
import { readIntentBlueprintFromEvent } from "@/lib/intent-engine/intent-blueprint-metadata";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readContextSpatialTargetFromEvent } from "@/lib/globe/spatial/write-context-spatial-target-from-text";
import { createContextInventoryCandidateProvider } from "@/lib/research-engine/context-inventory-provider";
import { createDiscoveryBatchCandidateProvider } from "@/lib/research-engine/discovery-batch-provider";
import { createLiveExternalCandidateProvider } from "@/lib/research-engine/live-external-provider";
import {
  buildResearchApprovalGate,
  formatResearchApprovalPromptKo,
} from "@/lib/research-engine/build-research-approval-gate";
import { isResearchUtterance } from "@/lib/research-engine/is-research-utterance";
import { mergeProviders } from "@/lib/research-engine/providers";
import { beginResearchRun } from "@/lib/research-engine/research-run-controller";
import { writeResearchApprovalGate } from "@/lib/research-engine/research-approval-store";
import {
  formatResearchResultComposeKo,
  runResearchEngine,
} from "@/lib/research-engine/run-research-engine";
import { startResearchExecutionTimelineWalk } from "@/lib/research-engine/run-research-timeline";
import { createBrowserResearchToolRuntime } from "@/lib/research-engine/tools/browser-runtime";
import type { ResearchResult } from "@/engines/research/schema";

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

const RESEARCH_NARRATION_SEED: ScoutNarration = {
  understandingKo: "조사 수술 시작 — 도구가 근거를 채웁니다",
  progressSteps: [],
  plan: {
    version: 1,
    intent: "Search",
    mode: "Continue",
    domain: "Mixed",
    entityLabelKo: null,
    dropLabelsKo: [],
    keepLabelsKo: [],
    anchorLabelKo: null,
    sortHint: "mixed",
  },
};

export async function runContextResearchEngineClient(input: {
  contextEventId: string;
  text: string;
}): Promise<boolean> {
  const contextEventId = input.contextEventId.trim();
  const text = input.text.trim();
  if (!contextEventId || !text || !isResearchUtterance(text)) {
    return false;
  }

  const run = beginResearchRun(contextEventId);
  const t0 = nowMs();
  let ttftMs: number | null = null;

  const walk = startResearchExecutionTimelineWalk({
    contextEventId,
    autoAdvance: false,
  });

  const narrationTurnId = publishScoutNarration({
    contextEventId,
    narration: RESEARCH_NARRATION_SEED,
  });

  const streamLine = (line: string) => {
    if (!run.isCurrent()) return;
    if (ttftMs == null) {
      ttftMs = Math.round(nowMs() - t0);
    }
    publishScoutNarrationLiveStep({
      contextEventId,
      textKo: line,
      turnId: narrationTurnId,
    });
  };

  const event = findLifeEventCandidate(contextEventId);
  const blueprint = readIntentBlueprintFromEvent(event);
  const spatial = readContextSpatialTargetFromEvent(event);

  const provider = mergeProviders([
    createDiscoveryBatchCandidateProvider(contextEventId),
    createContextInventoryCandidateProvider(contextEventId),
    createLiveExternalCandidateProvider({
      message: text,
      lat: spatial?.lat ?? null,
      lng: spatial?.lng ?? null,
      regionLabel: spatial?.label ?? null,
      enrichYt: true,
    }),
  ]);

  try {
    const probe = await Promise.resolve(
      provider.listCandidates({ queries: [text], limit: 8 }),
    );
    if (!run.isCurrent()) {
      walk?.stop();
      completeScoutNarration({ contextEventId, turnId: narrationTurnId });
      return false;
    }
    if (probe.length === 0) {
      walk?.stop();
      streamLine("Called live.inventory → skip (empty)");
      completeScoutNarration({ contextEventId, turnId: narrationTurnId });
      appendContextAgentComposeTurn(contextEventId, {
        role: "assistant",
        kind: "text",
        text: [
          "실시간으로 근거를 가져오지 못했어요.",
          spatial?.lat == null
            ? "목적지(예: 신주쿠·오사카)를 한 번 말해 주거나, 지도를 그쪽으로 맞춰 주세요."
            : "잠시 후 다시 물어봐 주세요. Places·요금 연결을 다시 시도할게요.",
        ].join("\n"),
      });
      return true;
    }

    const result = await runResearchEngine({
      text,
      blueprint,
      provider,
      anchorLat: spatial?.lat ?? null,
      anchorLng: spatial?.lng ?? null,
      toolRuntime: createBrowserResearchToolRuntime(),
      signal: run.signal,
      onStage: (stage) => {
        if (!run.isCurrent()) return;
        walk?.setStage(stage);
      },
      onTool: (summaryKo) => {
        streamLine(summaryKo);
      },
    });

    if (!run.isCurrent()) {
      walk?.stop();
      completeScoutNarration({ contextEventId, turnId: narrationTurnId });
      return false;
    }

    walk?.complete();
    completeScoutNarration({ contextEventId, turnId: narrationTurnId });

    const wallMs = Math.round(nowMs() - t0);
    if (typeof console !== "undefined" && console.debug) {
      console.debug(
        `[research] ttft=${ttftMs ?? wallMs}ms wall=${wallMs}ms tools=${result.toolTrace?.length ?? 0}`,
      );
    }

    const liveCount = (result.sourcesUsed ?? []).filter((s) =>
      /live\./iu.test(s.domain),
    ).length;

    // Decision bubble — evidence already lived in the Narrator stream.
    const slimResult: ResearchResult = {
      ...result,
      evidenceCards: [],
      toolTrace: (result.toolTrace ?? []).slice(-3),
      gapRetryTrace: [],
      strategyTrace: (result.strategyTrace ?? []).slice(-1),
      approvalGate: undefined,
    };
    const compose = formatResearchResultComposeKo(slimResult);
    const withLiveNote =
      liveCount > 0
        ? `${compose}\n실시간 SSOT: Places·LiteAPI${result.gapRetryTrace?.some((g) => g.toolId === "yt_preview" && g.status === "ok") ? "·YT" : ""} ${liveCount}건`
        : compose;

    const finalApproval = buildResearchApprovalGate({
      confidence: result.confidence,
      evidenceWeak: result.decision.evidenceWeak,
      bestTitle: result.decision.best.title,
      bestCandidateId: result.decision.best.candidateId,
      sectorSummariesKo: result.sectorResults?.map((s) => s.summaryKo) ?? [],
      toolOkCount:
        result.toolTrace?.filter((t) => t.status === "ok").length ?? 0,
      ssotCount: liveCount || (result.evidenceCards?.length ?? 0),
      filledAxesKo: axesFromResult(result),
      whyKo: result.decision.whyKo,
    });

    const body = finalApproval
      ? `${withLiveNote}\n\n${formatResearchApprovalPromptKo(finalApproval)}`
      : withLiveNote;

    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: body,
    });

    if (finalApproval) {
      writeResearchApprovalGate(contextEventId, {
        status: "waiting_approval",
        promptKo: finalApproval.promptKo,
        confidence: finalApproval.snapshot.confidence,
        bestTitle: finalApproval.snapshot.bestTitle,
        bestCandidateId: finalApproval.snapshot.bestCandidateId,
        sectorSummariesKo: finalApproval.snapshot.sectorSummariesKo,
        sourceUtterance: text,
        createdAtIso: new Date().toISOString(),
      });
      appendOperatorAskChipsComposeTurn(contextEventId, {
        chipDomain: "research_approval",
        hint: finalApproval.promptKo,
        pendingTrigger: text,
        chips: [...finalApproval.chips],
      });
    }

    void readContextAgentComposeThread(contextEventId);
    return true;
  } catch (err) {
    walk?.stop();
    completeScoutNarration({ contextEventId, turnId: narrationTurnId });
    if (
      !run.isCurrent() ||
      (err instanceof Error &&
        (err.name === "AbortError" || err.message === "research_aborted"))
    ) {
      return false;
    }
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: "조사를 마치지 못했어요. 조건을 조금 바꿔 다시 말해 주세요.",
    });
    return false;
  }
}

function axesFromResult(result: ResearchResult): string[] {
  const axes: string[] = [];
  for (const t of result.toolTrace ?? []) {
    if (t.status !== "ok") continue;
    const ko = t.summaryKo ?? "";
    if (/places_details|reviews|관측|리뷰/iu.test(ko)) axes.push("리뷰");
    if (/rate_lookup|price|요금|만/iu.test(ko)) axes.push("요금");
    if (/distance|도보|km/iu.test(ko)) axes.push("거리");
    if (/yt_preview|영상|youtube/iu.test(ko)) axes.push("영상");
  }
  return Array.from(new Set(axes));
}
