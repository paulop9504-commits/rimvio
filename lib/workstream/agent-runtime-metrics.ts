/**
 * Agent Runtime Metrics — tune Planning / Verify / Repair timings (ADR-045).
 */

export type AgentRuntimeMetricKind =
  | "observe"
  | "judge"
  | "plan"
  | "execute"
  | "verify"
  | "repair"
  | "commit"
  | "capability";

export type AgentRuntimeMetricSample = {
  readonly id: string;
  readonly kind: AgentRuntimeMetricKind;
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly durationMs: number;
  readonly atIso: string;
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type AgentRuntimeMetricsSummary = {
  readonly contextEventId: string;
  readonly samples: readonly AgentRuntimeMetricSample[];
  readonly planningMs: number;
  readonly verificationMs: number;
  readonly repairCount: number;
  readonly totalMs: number;
};

const samples: AgentRuntimeMetricSample[] = [];
let seq = 0;
const MAX = 300;

export function recordAgentRuntimeMetric(input: {
  readonly kind: AgentRuntimeMetricKind;
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly durationMs: number;
  readonly meta?: Readonly<Record<string, unknown>>;
}): AgentRuntimeMetricSample {
  seq += 1;
  const row: AgentRuntimeMetricSample = {
    id: `arm:${Date.now().toString(36)}:${seq}`,
    kind: input.kind,
    contextEventId: input.contextEventId.trim(),
    labelKo: input.labelKo,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    atIso: new Date().toISOString(),
    meta: input.meta,
  };
  samples.push(row);
  if (samples.length > MAX) samples.splice(0, samples.length - MAX);
  return row;
}

export function timeAgentRuntimeStep<T>(input: {
  readonly kind: AgentRuntimeMetricKind;
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly run: () => T;
}): T {
  const t0 =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const result = input.run();
  const t1 =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  recordAgentRuntimeMetric({
    kind: input.kind,
    contextEventId: input.contextEventId,
    labelKo: input.labelKo,
    durationMs: t1 - t0,
    meta: input.meta,
  });
  return result;
}

export function summarizeAgentRuntimeMetrics(
  contextEventId: string,
): AgentRuntimeMetricsSummary {
  const id = contextEventId.trim();
  const rows = samples.filter((s) => s.contextEventId === id);
  const sumKind = (kind: AgentRuntimeMetricKind) =>
    rows
      .filter((s) => s.kind === kind)
      .reduce((acc, s) => acc + s.durationMs, 0);
  return {
    contextEventId: id,
    samples: rows.slice(-40),
    planningMs: sumKind("plan") + sumKind("judge"),
    verificationMs: sumKind("verify"),
    repairCount: rows.filter((s) => s.kind === "repair").length,
    totalMs: rows.reduce((acc, s) => acc + s.durationMs, 0),
  };
}

export function formatAgentRuntimeMetricsBrief(
  summary: AgentRuntimeMetricsSummary,
  confidencePct?: number | null,
): string {
  const conf =
    confidencePct != null && Number.isFinite(confidencePct)
      ? `Confidence ${Math.round(confidencePct)}%`
      : null;
  return [
    "Runtime Metrics:",
    `  Planning ${summary.planningMs}ms`,
    `  Verification ${summary.verificationMs}ms`,
    `  Repair ×${summary.repairCount}`,
    conf,
    `  Total ${summary.totalMs}ms`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function clearAgentRuntimeMetricsForTests(): void {
  samples.length = 0;
  seq = 0;
}
