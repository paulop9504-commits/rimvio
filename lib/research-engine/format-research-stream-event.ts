/**
 * Fixed 1-line Research stream formats — Cursor tool-log feel.
 * Compose-only; no spinner / fake progress.
 */

import { formatCalledGotLine } from "@/lib/research-engine/tools/build-evidence-cards";
import type { ResearchToolCall } from "@/lib/research-engine/tools/types";
import type { ResearchGapRetryStep } from "@/lib/research-engine/tools/run-research-surgical-loop";
import type { ResearchStrategyId } from "@/lib/research-engine/research-strategy";

export function formatResearchToolStreamLine(call: ResearchToolCall): string {
  if (call.evidence) {
    return formatCalledGotLine({
      called: call.evidence.called,
      status: call.status,
      gotLine: call.evidence.gotLine,
    });
  }
  const mark =
    call.status === "ok" ? "✓" : call.status === "skip" ? "–" : "!";
  return `${call.toolId} ${mark} ${call.summaryKo}`;
}

export function formatResearchGapStreamLine(
  step: Pick<ResearchGapRetryStep, "missing" | "toolId">,
): string {
  return `gap · ${step.missing} → ${step.toolId}`;
}

export function formatResearchLensStreamLine(strategy: ResearchStrategyId): string {
  return `lens → ${strategy}`;
}

export function formatResearchSectorStreamLine(
  sector: string,
  phase: "start" | "merge" | "empty",
): string {
  if (phase === "merge") return `sector ${sector} · merge`;
  if (phase === "empty") return `sector ${sector} · empty`;
  return `sector ${sector} · start`;
}

export function formatResearchRescoreStreamLine(input: {
  confidence: number;
  rankTitle: string;
}): string {
  const confPct = Math.round(input.confidence * 100);
  const title = input.rankTitle.trim() || "(후보)";
  return `rescore · conf ${confPct}% · #${title}`;
}

export function formatResearchLiveSsotStreamLine(input: {
  gotLine: string;
  status?: "ok" | "skip" | "error";
}): string {
  return formatCalledGotLine({
    called: "live.inventory",
    status: input.status ?? "ok",
    gotLine: input.gotLine,
  });
}
