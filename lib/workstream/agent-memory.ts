/**
 * Unified Agent Memory — one bag (ADR-045 / ADR-046).
 * Goal · Context · Execution · Timeline · Preference · Commit · History
 * + World · Opportunities · Reflection · Supervisor.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readAgentExecutionSession } from "@/lib/workstream/agent-execution-session";
import { buildAgentExecutionState } from "@/lib/workstream/build-agent-execution-state";
import {
  readContextGoalState,
  type ContextGoalState,
} from "@/lib/workstream/context-goal-state";
import {
  readPreferenceGraph,
  type PreferenceGraph,
} from "@/lib/workstream/preference-graph";
import {
  readRimvioAgentSpineSnapshot,
  type RimvioCommitLedgerSummary,
} from "@/lib/workstream/rimvio-agent-spine";
import {
  readAgentRuntimeEventLog,
  type AgentRuntimeEvent,
} from "@/lib/workstream/agent-runtime-bus";
import { readWorkstream } from "@/lib/workstream/workstream-store";
import type { WorkstreamEvent, WorkstreamState } from "@/lib/workstream/types";
import type { AgentExecutionState } from "@/lib/workstream/build-agent-execution-state";
import type { ContextTaskGraph } from "@/lib/workstream/build-context-task-graph";
import {
  readWorldState,
  type WorldState,
} from "@/lib/workstream/world-state";
import {
  detectOpportunities,
  type DetectedOpportunity,
} from "@/lib/workstream/opportunity-detector";
import {
  readLatestAgentReflection,
  type AgentReflection,
} from "@/lib/workstream/agent-reflection";
import {
  superviseGoal,
  type GoalSupervisorReport,
} from "@/lib/workstream/goal-supervisor";

export type AgentMemory = {
  readonly contextEventId: string;
  readonly goal: ContextGoalState | null;
  readonly supervisor: GoalSupervisorReport | null;
  readonly world: WorldState | null;
  readonly opportunities: readonly DetectedOpportunity[];
  readonly context: {
    readonly event: EventCandidate | null;
    readonly workstream: WorkstreamState | null;
    readonly taskGraph: ContextTaskGraph;
  };
  readonly execution: AgentExecutionState;
  readonly timeline: readonly WorkstreamEvent[];
  readonly preference: PreferenceGraph;
  readonly commit: RimvioCommitLedgerSummary;
  readonly history: readonly AgentRuntimeEvent[];
  readonly reflection: AgentReflection | null;
};

/**
 * Read all Agent Memory facets for one Context.
 */
export function readAgentMemory(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
}): AgentMemory {
  const contextEventId = input.contextEventId.trim();
  const event = input.event ?? null;
  const workstream = readWorkstream(contextEventId);
  const spine = readRimvioAgentSpineSnapshot({
    contextEventId,
    event,
    workstream,
  });
  const session = readAgentExecutionSession();
  const execution = buildAgentExecutionState({
    contextEventId,
    event,
    workstream,
    session: session?.contextEventId === contextEventId ? session : null,
  });
  const world = readWorldState(contextEventId);
  const opportunities = detectOpportunities({
    contextEventId,
    world,
    startOrder: spine.contextGraph.taskGraph.tasks.length,
  });
  const goal = readContextGoalState(contextEventId);
  const supervisor = goal
    ? superviseGoal({
        contextEventId,
        event,
        workstream,
        goal,
        opportunities,
      })
    : null;

  return {
    contextEventId,
    goal,
    supervisor,
    world,
    opportunities,
    context: {
      event,
      workstream,
      taskGraph: spine.contextGraph.taskGraph,
    },
    execution,
    timeline: workstream?.events ?? [],
    preference: readPreferenceGraph(),
    commit: spine.commitLedger,
    history: readAgentRuntimeEventLog({ contextEventId, limit: 50 }),
    reflection: readLatestAgentReflection(contextEventId),
  };
}

export function formatAgentMemoryBrief(memory: AgentMemory): string {
  const goalLine = memory.goal
    ? `${memory.goal.goalKo} · ${memory.goal.percent}%`
    : "(no goal)";
  return [
    "Agent Memory:",
    `  Goal: ${goalLine}`,
    memory.supervisor
      ? `  Supervisor: ${memory.supervisor.nextToRaiseKo}`
      : null,
    `  World signals: ${memory.world?.signals.length ?? 0}`,
    `  Opportunities: ${memory.opportunities.length}`,
    `  Tasks: ${memory.context.taskGraph.tasks.length}`,
    `  Timeline: ${memory.timeline.length}`,
    `  Preference edges: ${memory.preference.edges.length}`,
    `  Commits: ${memory.commit.committedCount}`,
    `  History: ${memory.history.length}`,
    memory.reflection ? `  Reflection: ${memory.reflection.lines[0]}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
