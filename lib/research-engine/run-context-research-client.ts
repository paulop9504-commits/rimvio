"use client";

/**
 * Client entry — research-worthy utter → timeline + runResearchEngine.
 * Appends compose text summary. Does not Commit Reality.
 */

import {
  appendContextAgentComposeTurn,
  readContextAgentComposeThread,
} from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { readIntentBlueprintFromEvent } from "@/lib/intent-engine/intent-blueprint-metadata";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { createDiscoveryBatchCandidateProvider } from "@/lib/research-engine/discovery-batch-provider";
import { isResearchUtterance } from "@/lib/research-engine/is-research-utterance";
import {
  createFixtureCandidateProvider,
  mergeProviders,
} from "@/lib/research-engine/providers";
import {
  formatResearchResultComposeKo,
  runResearchEngine,
} from "@/lib/research-engine/run-research-engine";
import { startResearchExecutionTimelineWalk } from "@/lib/research-engine/run-research-timeline";
import type { FastScanCandidate } from "@/engines/research/schema";

const DEFAULT_FALLBACK_CANDIDATES: FastScanCandidate[] = [
  {
    id: "fallback-a",
    title: "지역 인기 후보 A",
    snippet: "여러 후기에서 위치가 좋다는 평가. 가격대는 중간.",
    domain: "reviews.example",
    reviewCount: 120,
    popularity: 0.7,
    mediaType: "review",
    language: "ko",
    metadata: { priceKrw: 80_000 },
    publishDateIso: new Date().toISOString(),
  },
  {
    id: "fallback-b",
    title: "대안 후보 B",
    snippet: "조용하고 가성비 언급. 다만 리뷰 수가 적음.",
    domain: "listings.example",
    reviewCount: 18,
    popularity: 0.45,
    mediaType: "listing",
    language: "ko",
    metadata: { priceKrw: 55_000 },
    publishDateIso: new Date().toISOString(),
  },
  {
    id: "fallback-c",
    title: "공식 안내 C",
    snippet: "공식 페이지 요약 — 영업 시간·위치만 확인됨.",
    domain: "official.example",
    reviewCount: 0,
    popularity: 0.3,
    mediaType: "official",
    language: "ko",
    metadata: { priceKrw: 90_000 },
  },
];

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

  const provider = mergeProviders([
    createDiscoveryBatchCandidateProvider(contextEventId),
    createFixtureCandidateProvider(DEFAULT_FALLBACK_CANDIDATES),
  ]);

  try {
    const result = await runResearchEngine({
      text,
      blueprint,
      provider,
      onStage: (stage) => {
        walk?.setStage(stage);
      },
    });
    walk?.complete();
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: formatResearchResultComposeKo(result),
    });
    // Touch thread for subscribers that only listen to appends after patch
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
