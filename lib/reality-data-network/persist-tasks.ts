/**
 * Supabase persist for Reality Task Pool (R2).
 */

import type { RealityTask, VerifierResponse } from "@/lib/reality-data-network/types";

export type RealityTaskPersistRow = {
  task_id: string;
  task_type: string;
  title_ko: string;
  target_label_ko: string;
  domain: string;
  status: string;
  supplier_id: string;
  base_reward_krw: number;
  consensus_confidence: number | null;
  consensus_verdict: string | null;
  target_ref: string | null;
  context_event_id: string | null;
  spawn_reason: string | null;
  ai_pre_label: Record<string, unknown> | null;
  submitted_at: string;
};

export type VerifierResponsePersistRow = {
  response_id: string;
  task_id: string;
  verifier_id: string;
  answer_id: string;
  answer_label_ko: string;
  responded_at: string;
  latency_ms: number;
};

export function taskToPersistRow(task: RealityTask): RealityTaskPersistRow {
  return {
    task_id: task.taskId,
    task_type: task.taskType,
    title_ko: task.titleKo,
    target_label_ko: task.targetLabelKo,
    domain: task.domain,
    status: task.status,
    supplier_id: task.supplierId,
    base_reward_krw: task.baseRewardKrw,
    consensus_confidence: task.consensusConfidence ?? null,
    consensus_verdict: task.consensusVerdict ?? null,
    target_ref: task.targetRef ?? null,
    context_event_id: task.contextEventId ?? null,
    spawn_reason: task.spawnReason ?? null,
    ai_pre_label: task.aiPreLabel ? { ...task.aiPreLabel } : null,
    submitted_at: task.submittedAt,
  };
}

export function responseToPersistRow(response: VerifierResponse): VerifierResponsePersistRow {
  return {
    response_id: response.responseId,
    task_id: response.taskId,
    verifier_id: response.verifierId,
    answer_id: response.answerId,
    answer_label_ko: response.answerLabelKo,
    responded_at: response.at,
    latency_ms: response.latencyMs,
  };
}

export async function persistRealityTaskAsync(task: RealityTask): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      await fetch("/api/reality-data/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskToPersistRow(task)),
        keepalive: true,
      });
    } catch {
      // in-memory SSOT
    }
  }
}

export async function persistVerifierResponseAsync(response: VerifierResponse): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      await fetch("/api/reality-data/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(responseToPersistRow(response)),
        keepalive: true,
      });
    } catch {
      // in-memory SSOT
    }
  }
}
