/**
 * Agent Execution Feed — append-only step log (Cursor / Claude Code style).
 * Done rows collapse to ✓; current row is emphasized with ▶ + spinner.
 */

import type { AgentActivityTranscript } from "@/lib/context-run/agent-activity-transcript";
import { copy } from "@/lib/copy/human-ko";

export type AgentExecutionFeedRowStatus = "done" | "running";

export type AgentExecutionFeedRow = {
  readonly id: string;
  readonly status: AgentExecutionFeedRowStatus;
  readonly labelKo: string;
  readonly detailKo: string | null;
  readonly metricKo: string | null;
};

export type AgentExecutionFeedView = {
  readonly titleKo: string;
  readonly running: boolean;
  readonly utterance: string;
  readonly rows: readonly AgentExecutionFeedRow[];
  /** 0–100 when known; otherwise null (hide bar). */
  readonly progressPercent: number | null;
};

export function buildAgentExecutionFeedView(
  tape: AgentActivityTranscript | null,
  progressPercent: number | null = null,
): AgentExecutionFeedView | null {
  if (!tape || tape.events.length === 0) return null;

  const rows: AgentExecutionFeedRow[] = tape.events.map((ev, index) => {
    const isLast = index === tape.events.length - 1;
    const running = tape.running && isLast;
    return {
      id: ev.id,
      status: running ? "running" : "done",
      labelKo: ev.labelKo.trim() || copy.globe.executionFeed.stepFallback || "작업 중",
      detailKo: running
        ? ev.detailKo?.trim() || null
        : null,
      metricKo: ev.metricKo?.trim() || null,
    };
  });

  if (!tape.running) {
    const last = rows[rows.length - 1];
    const readyLabel = copy.globe.executionFeed.ready || "Ready";
    if (last && last.labelKo !== readyLabel) {
      rows.push({
        id: `${last.id}_ready`,
        status: "done",
        labelKo: readyLabel,
        detailKo: null,
        metricKo: null,
      });
    }
  }

  return {
    titleKo: copy.globe.executionFeed.title || "Execution Feed",
    running: tape.running,
    utterance: tape.utterance,
    rows,
    progressPercent:
      tape.running && progressPercent != null && Number.isFinite(progressPercent)
        ? Math.max(0, Math.min(100, Math.round(progressPercent)))
        : tape.running
          ? Math.min(
              92,
              Math.max(12, Math.round((tape.events.length / 8) * 100)),
            )
          : null,
  };
}
