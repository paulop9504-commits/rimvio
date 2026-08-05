/**
 * Cursor-style Agent Activity transcript (ADR-050).
 * Shows Thought · Explore · Tool · Patch · Verify — not a final answer dump.
 */

import type { AgentProductPipelineStage } from "@/lib/context-run/agent-product-pipeline";
import { AGENT_PRODUCT_PIPELINE_STATUS_KO } from "@/lib/context-run/agent-product-pipeline";

export const AGENT_ACTIVITY_KINDS = [
  "thought",
  "explore",
  "tool",
  "patch",
  "verify",
  "status",
] as const;

export type AgentActivityKind = (typeof AGENT_ACTIVITY_KINDS)[number];

export type AgentActivityEvent = {
  readonly id: string;
  readonly kind: AgentActivityKind;
  readonly labelKo: string;
  readonly detailKo?: string | null;
  /** Optional Cursor-like metric: "3 files" / "후보 +4" */
  readonly metricKo?: string | null;
  readonly atIso: string;
  readonly stage?: AgentProductPipelineStage | null;
};

export type AgentActivityTranscript = {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly startedAtMs: number;
  readonly endedAtMs: number | null;
  readonly running: boolean;
  readonly events: readonly AgentActivityEvent[];
};

const listeners = new Set<() => void>();
let transcript: AgentActivityTranscript | null = null;
let seq = 0;

function emit(): void {
  for (const l of listeners) l();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("rimvio:agent-activity-transcript", {
        detail: transcript,
      }),
    );
  }
}

export function subscribeAgentActivityTranscript(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readAgentActivityTranscript(): AgentActivityTranscript | null {
  return transcript;
}

export function clearAgentActivityTranscriptForTests(): void {
  transcript = null;
  emit();
}

export function beginAgentActivityTranscript(input: {
  readonly contextEventId: string;
  readonly utterance: string;
}): AgentActivityTranscript {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  const startedAtMs = Date.now();
  transcript = {
    contextEventId,
    utterance,
    startedAtMs,
    endedAtMs: null,
    running: true,
    events: [
      {
        id: `act_${++seq}`,
        kind: "thought",
        labelKo: "요청을 읽고 작업 경로를 잡아요",
        detailKo: utterance.slice(0, 80) || null,
        atIso: new Date(startedAtMs).toISOString(),
        stage: "intent",
      },
    ],
  };
  emit();
  return transcript;
}

export function appendAgentActivityEvent(input: {
  readonly kind: AgentActivityKind;
  readonly labelKo: string;
  readonly detailKo?: string | null;
  readonly metricKo?: string | null;
  readonly stage?: AgentProductPipelineStage | null;
}): AgentActivityEvent | null {
  if (!transcript) return null;
  const event: AgentActivityEvent = {
    id: `act_${++seq}`,
    kind: input.kind,
    labelKo: input.labelKo.trim(),
    detailKo: input.detailKo?.trim() || null,
    metricKo: input.metricKo?.trim() || null,
    atIso: new Date().toISOString(),
    stage: input.stage ?? null,
  };
  transcript = {
    ...transcript,
    events: [...transcript.events, event].slice(-40),
  };
  emit();
  return event;
}

export function appendAgentActivityForStage(
  stage: AgentProductPipelineStage,
  extra?: {
    readonly detailKo?: string | null;
    readonly metricKo?: string | null;
  },
): void {
  const kind: AgentActivityKind =
    stage === "intent" || stage === "context_resolution"
      ? "thought"
      : stage === "planner" || stage === "object_discovery"
        ? "explore"
        : stage === "object_enrichment" || stage === "candidate_evaluation"
          ? "tool"
          : stage === "workspace_patch"
            ? "patch"
            : stage === "projection" || stage === "agent_status"
              ? "status"
              : stage === "prepare" || stage === "commit"
                ? "verify"
                : "status";

  appendAgentActivityEvent({
    kind,
    labelKo: AGENT_PRODUCT_PIPELINE_STATUS_KO[stage],
    detailKo: extra?.detailKo,
    metricKo: extra?.metricKo,
    stage,
  });
}

export function finishAgentActivityTranscript(input?: {
  readonly summaryKo?: string | null;
}): void {
  if (!transcript) return;
  if (input?.summaryKo?.trim()) {
    appendAgentActivityEvent({
      kind: "status",
      labelKo: input.summaryKo.trim(),
      stage: "agent_status",
    });
  }
  transcript = {
    ...transcript,
    running: false,
    endedAtMs: Date.now(),
  };
  emit();
}

export function formatAgentActivityElapsed(
  t: AgentActivityTranscript | null,
): string {
  if (!t) return "";
  const end = t.endedAtMs ?? Date.now();
  const sec = Math.max(1, Math.round((end - t.startedAtMs) / 1000));
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

/** Let React paint between pipeline stages (Cursor-like live tape). */
export function yieldAgentActivityFrame(ms = 48): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      setTimeout(resolve, 0);
      return;
    }
    window.setTimeout(resolve, ms);
  });
}
