"use client";

import { commitContextExecutionPlan } from "@/lib/context-execution/commit-context-execution-plan";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type PersistContextExecutionPlanResult =
  | { ok: true; changed: boolean; eventId: string }
  | { ok: false; reason: "context_not_found" | "commit_failed" };

/** Client — localStorage SSOT + encrypted vault queue (Supabase when online). */
export function persistContextExecutionPlanClient(input: {
  contextEventId: string;
  plan: ContextExecutionPlanV1;
}): PersistContextExecutionPlanResult {
  const eventId = input.contextEventId.trim();
  if (!eventId) {
    return { ok: false, reason: "context_not_found" };
  }
  const event = findLifeEventCandidate(eventId);
  if (!event) {
    return { ok: false, reason: "context_not_found" };
  }

  try {
    const { changed } = commitContextExecutionPlan({ event, plan: input.plan });
    return { ok: true, changed, eventId };
  } catch {
    return { ok: false, reason: "commit_failed" };
  }
}

/** Best-effort online vault flush after plan commit (no-op offline). */
export async function persistContextExecutionPlanClientAsync(input: {
  contextEventId: string;
  plan: ContextExecutionPlanV1;
  flushVault?: boolean;
}): Promise<PersistContextExecutionPlanResult> {
  const result = persistContextExecutionPlanClient(input);
  if (result.ok && result.changed && input.flushVault !== false && typeof window !== "undefined") {
    try {
      const { flushVaultSyncQueue } = await import("@/lib/materialize/flush-vault-sync-client");
      await flushVaultSyncQueue({ limit: 4 });
    } catch {
      /* offline — queue remains pending */
    }
  }
  return result;
}
