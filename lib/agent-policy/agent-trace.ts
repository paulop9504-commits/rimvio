/**
 * Law 25 — Agent Should Leave Breadcrumbs (AI Trace).
 */

import type { AgentActionOwnership } from "@/lib/agent-policy/action-ownership";

export const AGENT_TRACE_KINDS = [
  "observe",
  "plan",
  "search",
  "replace",
  "refine",
  "select",
  "prepare",
  "commit",
  "note",
] as const;

export type AgentTraceKind = (typeof AGENT_TRACE_KINDS)[number];

export type AgentTraceEntry = {
  readonly id: string;
  readonly atIso: string;
  readonly kind: AgentTraceKind;
  readonly summaryKo: string;
  readonly ownership: AgentActionOwnership;
  readonly evidenceLinesKo: readonly string[];
  readonly entityIds: readonly string[];
};

const TRACE_CAP = 40;

export function createAgentTraceEntry(input: {
  readonly kind: AgentTraceKind;
  readonly summaryKo: string;
  readonly ownership: AgentActionOwnership;
  readonly evidenceLinesKo?: readonly string[] | null;
  readonly entityIds?: readonly string[] | null;
  readonly atIso?: string;
}): AgentTraceEntry {
  const atIso = input.atIso ?? new Date().toISOString();
  return {
    id: `atrace_${atIso}_${Math.random().toString(36).slice(2, 8)}`,
    atIso,
    kind: input.kind,
    summaryKo: input.summaryKo.trim(),
    ownership: input.ownership,
    evidenceLinesKo: (input.evidenceLinesKo ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 4),
    entityIds: (input.entityIds ?? []).filter(Boolean).slice(0, 8),
  };
}

export function appendAgentTrace(
  prev: readonly AgentTraceEntry[] | null | undefined,
  entry: AgentTraceEntry,
): readonly AgentTraceEntry[] {
  return [...(prev ?? []), entry].slice(-TRACE_CAP);
}

export function formatAgentTraceTimelineKo(
  trace: readonly AgentTraceEntry[] | null | undefined,
  limit = 6,
): string[] {
  if (!trace?.length) return [];
  return trace.slice(-limit).map((e) => {
    const t = e.atIso.slice(11, 16);
    return `${t} · ${e.summaryKo}`;
  });
}
