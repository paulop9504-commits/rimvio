"use client";

/**
 * Client entry — research-worthy utter → timeline + runResearchEngine.
 * Appends compose text + Cursor-like approval chips. Does not Commit Reality.
 */

import {
  appendContextAgentComposeTurn,
  appendOperatorAskChipsComposeTurn,
  readContextAgentComposeThread,
} from "@/lib/globe/assistant/context-agent-compose-thread-store";
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
import { writeResearchApprovalGate } from "@/lib/research-engine/research-approval-store";
import {
  formatResearchResultComposeKo,
  runResearchEngine,
} from "@/lib/research-engine/run-research-engine";
import { startResearchExecutionTimelineWalk } from "@/lib/research-engine/run-research-timeline";
import { createBrowserResearchToolRuntime } from "@/lib/research-engine/tools/browser-runtime";

export async function runContextResearchEngineClient(input: {
  contextEventId: string;
  text: string;
}): Promise<boolean> {
  const contextEventId = input.contextEventId.trim();
  const text = input.text.trim();
  if (!contextEventId || !text || !isResearchUtterance(text)) {
    return false;
  }

  const walk = startResearchExecutionTimelineWalk({
    contextEventId,
    autoAdvance: false,
  });

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
    if (probe.length === 0) {
      walk?.stop();
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
      onStage: (stage) => {
        walk?.setStage(stage);
      },
      onTool: (summaryKo) => {
        void summaryKo;
      },
    });
    walk?.complete();

    const liveCount = (result.sourcesUsed ?? []).filter((s) =>
      /live\./iu.test(s.domain),
    ).length;
    const compose = formatResearchResultComposeKo(result);
    const withLiveNote =
      liveCount > 0
        ? `${compose}\n실시간 SSOT: Places·LiteAPI${result.gapRetryTrace?.some((g) => g.toolId === "yt_preview" && g.status === "ok") ? "·YT" : ""} ${liveCount}건`
        : compose;

    const approval = buildResearchApprovalGate({
      confidence: result.confidence,
      evidenceWeak: result.decision.evidenceWeak,
      bestTitle: result.decision.best.title,
      bestCandidateId: result.decision.best.candidateId,
      sectorSummariesKo: result.sectorResults?.map((s) => s.summaryKo) ?? [],
    });
    const body = approval
      ? `${withLiveNote}\n\n${formatResearchApprovalPromptKo(approval)}`
      : withLiveNote;

    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: body,
    });

    if (approval) {
      writeResearchApprovalGate(contextEventId, {
        status: "waiting_approval",
        promptKo: approval.promptKo,
        confidence: approval.snapshot.confidence,
        bestTitle: approval.snapshot.bestTitle,
        bestCandidateId: approval.snapshot.bestCandidateId,
        sectorSummariesKo: approval.snapshot.sectorSummariesKo,
        sourceUtterance: text,
        createdAtIso: new Date().toISOString(),
      });
      appendOperatorAskChipsComposeTurn(contextEventId, {
        chipDomain: "research_approval",
        hint: approval.promptKo,
        pendingTrigger: text,
        chips: [...approval.chips],
      });
    }

    void readContextAgentComposeThread(contextEventId);
    return true;
  } catch {
    walk?.stop();
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: "조사를 마치지 못했어요. 조건을 조금 바꿔 다시 말해 주세요.",
    });
    return false;
  }
}
