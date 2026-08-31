/**
 * Agent Trace — debug SSOT for autonomous loops (P9).
 */

export type AgentTraceEventKind =
  | "goal.created"
  | "plan.created"
  | "task.started"
  | "agent.resolved"
  | "tool.called"
  | "tool.completed"
  | "observation.created"
  | "workspace.mutated"
  | "verification.completed"
  | "replan.started"
  | "replan.completed"
  | "task.completed"
  | "goal.completed"
  | "human_commit_requested"
  | "capability.recorded"
  | "capability.composite"
  | "reality.task.spawned"
  | "blocked";

export type AgentTraceEvent = {
  readonly kind: AgentTraceEventKind;
  readonly atIso: string;
  readonly detail: string;
  readonly taskId?: string;
  readonly agentId?: string;
  readonly toolId?: string;
  readonly spawnReason?: string;
};

export type AgentTrace = {
  readonly events: readonly AgentTraceEvent[];
};

export function createAgentTrace(): AgentTrace {
  return { events: [] };
}

export function traceEvent(
  trace: AgentTrace,
  kind: AgentTraceEventKind,
  detail: string,
  meta?: {
    readonly taskId?: string;
    readonly agentId?: string;
    readonly toolId?: string;
    readonly spawnReason?: string;
  },
): AgentTrace {
  return {
    events: [
      ...trace.events,
      {
        kind,
        atIso: new Date().toISOString(),
        detail,
        taskId: meta?.taskId,
        agentId: meta?.agentId,
        toolId: meta?.toolId,
        spawnReason: meta?.spawnReason,
      },
    ],
  };
}

export function summarizeTrace(trace: AgentTrace): string {
  return trace.events.map((e) => `${e.kind}:${e.detail.slice(0, 40)}`).join(" → ");
}
