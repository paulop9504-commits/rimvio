/**
 * Ephemeral Agent Execution session — live steps for *this* turn / densify.
 * Durable history stays in workstream Event Log (ADR-039).
 */

import type { AgentExecStep } from "@/lib/workstream/build-agent-execution-state";

export type AgentExecutionSession = {
  readonly contextEventId: string;
  readonly headlineKo: string | null;
  readonly statusHint: "running" | "committing" | "healing" | null;
  readonly steps: readonly AgentExecStep[];
  readonly nextHints: readonly string[];
  readonly commitStatus: "none" | "preparing" | "committed" | "failed";
  readonly errorState: { readonly messageKo: string } | null;
  readonly recoveryPlan: readonly { readonly labelKo: string }[] | null;
  readonly healEntries: readonly {
    readonly id: string;
    readonly atIso: string;
    readonly labelKo: string;
  }[];
  readonly updatedAtIso: string;
};

const EVENT = "rimvio:agent-execution-session";

let session: AgentExecutionSession | null = null;

function emit(next: AgentExecutionSession | null): void {
  session = next;
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: next }),
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

export function readAgentExecutionSession(): AgentExecutionSession | null {
  return session;
}

export function beginAgentExecutionSession(input: {
  readonly contextEventId: string;
  readonly headlineKo?: string | null;
  readonly statusHint?: AgentExecutionSession["statusHint"];
}): AgentExecutionSession {
  const next: AgentExecutionSession = {
    contextEventId: input.contextEventId.trim(),
    headlineKo: input.headlineKo?.trim() || null,
    statusHint: input.statusHint ?? "running",
    steps: [],
    nextHints: [],
    commitStatus: "none",
    errorState: null,
    recoveryPlan: null,
    healEntries: [],
    updatedAtIso: nowIso(),
  };
  emit(next);
  return next;
}

export function setAgentExecutionHeadline(headlineKo: string | null): void {
  if (!session) return;
  emit({
    ...session,
    headlineKo: headlineKo?.trim() || null,
    updatedAtIso: nowIso(),
  });
}

export function pushAgentExecutionStep(input: {
  readonly id: string;
  readonly labelKo: string;
  readonly status?: AgentExecStep["status"];
  readonly contextEventId?: string;
}): void {
  if (!session) {
    beginAgentExecutionSession({
      contextEventId: input.contextEventId?.trim() || "scratch",
      headlineKo: input.labelKo,
    });
  }
  if (!session) return;
  const status = input.status ?? "running";
  const steps = session.steps.filter((s) => s.id !== input.id);
  const prevRunning = steps.map((s) =>
    s.status === "running" && status === "running"
      ? { ...s, status: "done" as const }
      : s,
  );
  emit({
    ...session,
    steps: [
      ...prevRunning,
      {
        id: input.id,
        labelKo: input.labelKo,
        status,
        atIso: nowIso(),
      },
    ],
    updatedAtIso: nowIso(),
  });
}

export function completeAgentExecutionStep(id: string): void {
  if (!session) return;
  emit({
    ...session,
    steps: session.steps.map((s) =>
      s.id === id ? { ...s, status: "done" as const } : s,
    ),
    updatedAtIso: nowIso(),
  });
}

export function setAgentExecutionNextHints(hints: readonly string[]): void {
  if (!session) return;
  emit({
    ...session,
    nextHints: hints.map((h) => h.trim()).filter(Boolean).slice(0, 4),
    updatedAtIso: nowIso(),
  });
}

export function setAgentExecutionCommitStatus(
  commitStatus: AgentExecutionSession["commitStatus"],
): void {
  if (!session) return;
  emit({
    ...session,
    commitStatus,
    statusHint: commitStatus === "preparing" ? "committing" : session.statusHint,
    updatedAtIso: nowIso(),
  });
}

/**
 * Self-heal loop surface — problem → plan → healed steps.
 */
export function beginAgentHealing(input: {
  readonly problemKo: string;
  readonly recoveryPlan: readonly string[];
}): void {
  const ctx = session?.contextEventId ?? "scratch";
  if (!session) {
    beginAgentExecutionSession({
      contextEventId: ctx,
      headlineKo: "문제 해결 중…",
      statusHint: "healing",
    });
  }
  if (!session) return;
  emit({
    ...session,
    headlineKo: "문제 해결 중…",
    statusHint: "healing",
    errorState: { messageKo: input.problemKo },
    recoveryPlan: input.recoveryPlan.map((labelKo) => ({ labelKo })),
    healEntries: [
      ...session.healEntries,
      {
        id: `heal:${Date.now().toString(36)}`,
        atIso: nowIso(),
        labelKo: input.problemKo,
      },
    ],
    updatedAtIso: nowIso(),
  });
}

export function finishAgentHealing(input?: {
  readonly summaryKo?: string;
}): void {
  if (!session) return;
  const summary = input?.summaryKo?.trim();
  emit({
    ...session,
    headlineKo: summary || "검증 완료",
    statusHint: null,
    errorState: null,
    recoveryPlan: null,
    healEntries: summary
      ? [
          ...session.healEntries,
          {
            id: `heal-done:${Date.now().toString(36)}`,
            atIso: nowIso(),
            labelKo: summary,
          },
        ]
      : session.healEntries,
    steps: [
      ...session.steps,
      ...(session.recoveryPlan ?? []).map((p, i) => ({
        id: `healed:${i}`,
        labelKo: p.labelKo,
        status: "healed" as const,
        atIso: nowIso(),
      })),
    ],
    updatedAtIso: nowIso(),
  });
}

export function finishAgentExecutionSession(input?: {
  readonly keepMs?: number;
}): void {
  if (!session) return;
  const keepMs = input?.keepMs ?? 0;
  const snapshot = {
    ...session,
    statusHint: null as const,
    headlineKo: session.headlineKo,
    commitStatus:
      session.commitStatus === "preparing"
        ? ("committed" as const)
        : session.commitStatus,
    updatedAtIso: nowIso(),
  };
  emit(snapshot);
  if (keepMs <= 0) {
    emit(null);
    return;
  }
  if (typeof window === "undefined") {
    emit(null);
    return;
  }
  window.setTimeout(() => {
    if (session?.updatedAtIso === snapshot.updatedAtIso) {
      emit(null);
    }
  }, keepMs);
}

export function subscribeAgentExecutionSession(
  listener: (detail: AgentExecutionSession | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    listener((event as CustomEvent<AgentExecutionSession | null>).detail);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Pure helper — schedule conflict → recovery plan (Verification Agent seed). */
export function buildHealingPlanForScheduleConflict(): {
  readonly problemKo: string;
  readonly recoveryPlan: readonly string[];
} {
  return {
    problemKo: "호텔 이동 시간이 일정과 충돌",
    recoveryPlan: [
      "이동 시간 재계산",
      "일정 재배치",
      "Timeline 업데이트",
    ],
  };
}
