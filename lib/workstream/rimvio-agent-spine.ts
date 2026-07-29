/**
 * Rimvio Agent Spine — Cursor five-system isomorphism (ADR-041).
 *
 * Cursor:  Agent + Project State + Execution History + Tool Access + Verification Loop
 * Rimvio:  Context Graph + Agent Execution State + Reality Timeline + Commit Ledger + Self Repair
 *
 * Prompts are subordinate. These five must stay wired.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildAgentExecutionState,
  type AgentExecutionState,
  type RealityTimelineEntry,
} from "@/lib/workstream/build-agent-execution-state";
import {
  readAgentExecutionSession,
  type AgentExecutionSession,
} from "@/lib/workstream/agent-execution-session";
import { buildContextWorkState } from "@/lib/workstream/sync-context-work-state";
import type { ContextWorkState } from "@/lib/workstream/context-work-state";
import {
  buildContextTaskGraph,
  type ContextTaskGraph,
} from "@/lib/workstream/build-context-task-graph";
import { readWorkstream } from "@/lib/workstream/workstream-store";
import type { WorkstreamState } from "@/lib/workstream/types";
import { RIMVIO_AGENT_EXECUTION_LOOP } from "@/lib/workstream/rimvio-agent-operating-law";
import { computeContextCompleteness } from "@/lib/workstream/compute-context-completeness";

/** Cursor → Rimvio pillar map (immutable product vocabulary). */
export const CURSOR_RIMVIO_PILLAR_MAP = [
  {
    cursor: "Agent",
    rimvio: "Rimvio Agent",
    owner: "lib/workstream/rimvio-agent-operating-law.ts",
  },
  {
    cursor: "Project State",
    rimvio: "Context Graph",
    owner: "EventCandidate + workstream + Workspace",
  },
  {
    cursor: "Execution History",
    rimvio: "Agent Execution State",
    owner: "lib/workstream/build-agent-execution-state.ts",
  },
  {
    cursor: "Tool Access",
    rimvio: "Tools / @ / Workspace patches",
    owner: "lib/tool-registry · lib/context-workspace",
  },
  {
    cursor: "Verification Loop",
    rimvio: "Self Repair Loop",
    owner: "lib/workstream/agent-execution-loop.ts",
  },
] as const;

/** The five Reality pillars that must remain connected. */
export const RIMVIO_AGENT_SPINE_PILLARS = [
  "context_graph",
  "agent_execution_state",
  "reality_timeline",
  "commit_ledger",
  "self_repair_loop",
] as const;

export type RimvioAgentSpinePillar =
  (typeof RIMVIO_AGENT_SPINE_PILLARS)[number];

export const RIMVIO_AGENT_SPINE_SLOGAN =
  "Prompts are subordinate. Context Graph + Execution State + Reality Timeline + Commit Ledger + Self Repair stay wired." as const;

export type RimvioCommitLedgerSummary = {
  readonly hasCommittedResidue: boolean;
  readonly committedEventCount: number;
  readonly lastCommitLabelKo: string | null;
  readonly completenessPercent: number;
};

export type RimvioAgentSpineSnapshot = {
  readonly contextEventId: string;
  /** Project State analog. */
  readonly contextGraph: {
    readonly title: string;
    readonly work: ContextWorkState;
    readonly taskGraph: ContextTaskGraph;
    readonly event: EventCandidate | null;
  };
  /** Execution History analog. */
  readonly agentExecutionState: AgentExecutionState;
  readonly session: AgentExecutionSession | null;
  /** Terminal / diff trail analog. */
  readonly realityTimeline: readonly RealityTimelineEntry[];
  /** git commit analog. */
  readonly commitLedger: RimvioCommitLedgerSummary;
  /** Verification loop stage vocabulary. */
  readonly selfRepairLoop: {
    readonly stages: typeof RIMVIO_AGENT_EXECUTION_LOOP;
    readonly healing: boolean;
    readonly issueKo: string | null;
  };
  readonly workstream: WorkstreamState | null;
};

/**
 * Compose all five pillars for one Context — Agent reads this, not chat history.
 */
export function readRimvioAgentSpineSnapshot(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
}): RimvioAgentSpineSnapshot {
  const contextEventId = input.contextEventId.trim();
  const event = input.event ?? null;
  const workstream = contextEventId ? readWorkstream(contextEventId) : null;
  const work = buildContextWorkState({
    contextEventId,
    event,
    workstream,
  });
  const sessionRaw = readAgentExecutionSession();
  const session =
    sessionRaw?.contextEventId === contextEventId ? sessionRaw : null;
  const agentExecutionState = buildAgentExecutionState({
    contextEventId,
    event,
    workstream,
    work,
    session,
  });
  const taskGraph = buildContextTaskGraph({
    contextEventId,
    event,
    workstream,
    work,
  });
  const completeness = computeContextCompleteness({
    contextEventId,
    event,
  });
  const committedKinds = new Set([
    "HotelCommitted",
    "FlightCommitted",
  ] as const);
  const committedEvents = (workstream?.events ?? []).filter((e) =>
    committedKinds.has(e.kind as "HotelCommitted" | "FlightCommitted"),
  );
  const lastCommit = committedEvents[committedEvents.length - 1] ?? null;

  return {
    contextEventId,
    contextGraph: {
      title: work.title,
      work,
      taskGraph,
      event,
    },
    agentExecutionState,
    session,
    realityTimeline: agentExecutionState.timeline,
    commitLedger: {
      hasCommittedResidue: committedEvents.length > 0,
      committedEventCount: committedEvents.length,
      lastCommitLabelKo: lastCommit?.labelKo ?? null,
      completenessPercent: completeness.percent,
    },
    selfRepairLoop: {
      stages: RIMVIO_AGENT_EXECUTION_LOOP,
      healing: agentExecutionState.status === "healing",
      issueKo: agentExecutionState.errorState?.messageKo ?? null,
    },
    workstream,
  };
}

export function formatRimvioAgentSpineBrief(
  snap: RimvioAgentSpineSnapshot,
): string {
  return [
    "# Rimvio Agent Spine",
    RIMVIO_AGENT_SPINE_SLOGAN,
    "",
    `Context Graph: ${snap.contextGraph.title} (${snap.contextGraph.work.percent}%)`,
    `Execution: ${snap.agentExecutionState.status} · running=${snap.agentExecutionState.runningStep?.labelKo ?? "—"}`,
    `Timeline entries: ${snap.realityTimeline.length}`,
    `Commit Ledger: ${snap.commitLedger.committedEventCount} commits · completeness ${snap.commitLedger.completenessPercent}%`,
    `Self Repair: ${snap.selfRepairLoop.healing ? "healing" : "idle"}${snap.selfRepairLoop.issueKo ? ` · ${snap.selfRepairLoop.issueKo}` : ""}`,
  ].join("\n");
}
