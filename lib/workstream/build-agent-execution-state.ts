/**
 * Agent Execution State — Reality IDE projection (ADR-039).
 * Durable = Work State + Event Log. Live = session steps.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CONTEXT_WORK_SLOT_LABEL_KO,
  type ContextWorkState,
} from "@/lib/workstream/context-work-state";
import { buildContextWorkState } from "@/lib/workstream/sync-context-work-state";
import {
  readContextGoalState,
  syncContextGoalState,
} from "@/lib/workstream/context-goal-state";
import {
  residueLayerForEventKind,
  type WorkstreamEvent,
  type WorkstreamState,
} from "@/lib/workstream/types";
import type { AgentExecutionSession } from "@/lib/workstream/agent-execution-session";
import {
  buildContextTaskGraph,
  type ContextTaskGraph,
} from "@/lib/workstream/build-context-task-graph";

export type AgentExecStepStatus =
  | "done"
  | "running"
  | "pending"
  | "failed"
  | "healed";

export type AgentExecStep = {
  readonly id: string;
  readonly labelKo: string;
  readonly status: AgentExecStepStatus;
  readonly atIso?: string;
};

export type RealityTimelineEntry = {
  readonly id: string;
  readonly atIso: string;
  readonly labelKo: string;
  readonly kind: "observation" | "selection" | "commit" | "context" | "heal";
};

export type AgentExecutionStatus =
  | "idle"
  | "building"
  | "optimizing"
  | "committing"
  | "healing"
  | "awaiting_commit";

export type AgentExecutionState = {
  readonly contextEventId: string;
  readonly currentTaskKo: string;
  readonly goalKo: string;
  readonly status: AgentExecutionStatus;
  readonly percent: number;
  readonly completedSteps: readonly AgentExecStep[];
  readonly runningStep: AgentExecStep | null;
  readonly nextSteps: readonly AgentExecStep[];
  /** Self-heal / auto-fix lines (자동 처리). */
  readonly autoResolved: readonly AgentExecStep[];
  readonly timeline: readonly RealityTimelineEntry[];
  readonly commitStatus: "none" | "preparing" | "committed" | "failed";
  readonly errorState: { readonly messageKo: string } | null;
  readonly recoveryPlan: readonly { readonly labelKo: string }[] | null;
  readonly liveHeadlineKo: string | null;
  /** Always-alive Task Graph (Cursor-class goal tracking). */
  readonly taskGraph: ContextTaskGraph;
};

const EVENT_LABEL: Record<WorkstreamEvent["kind"], string> = {
  HotelSelected: "숙소 후보 선택",
  HotelCommitted: "호텔 예약 Context 감지",
  RestaurantAdded: "맛집 추가",
  RentalAdded: "이동 수단 추가",
  FlightCommitted: "항공 확정",
  ScheduleUpdated: "Timeline 업데이트",
  BudgetUpdated: "예산 반영",
  TitleInferred: "Context 제목 확정",
};

function timelineKind(
  kind: WorkstreamEvent["kind"],
): RealityTimelineEntry["kind"] {
  const layer = residueLayerForEventKind(kind);
  if (layer === "commit") return "commit";
  if (layer === "context_reality") return "context";
  if (layer === "observation") return "observation";
  return "selection";
}

function workStatusToExec(
  work: ContextWorkState,
  session: AgentExecutionSession | null,
): AgentExecutionStatus {
  if (session?.errorState) return "healing";
  if (session?.commitStatus === "preparing") return "committing";
  if (session?.statusHint === "healing") return "healing";
  if (work.status === "optimizing") return "optimizing";
  if (work.status === "awaiting_commit") return "awaiting_commit";
  if (work.status === "building") return "building";
  if (session?.steps.some((s) => s.status === "running")) return "building";
  return "idle";
}

/**
 * Pure projection for Agent Status Panel + Reality Timeline.
 */
export function buildAgentExecutionState(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly workstream?: WorkstreamState | null;
  readonly work?: ContextWorkState | null;
  readonly session?: AgentExecutionSession | null;
}): AgentExecutionState {
  const contextEventId = input.contextEventId.trim();
  const work =
    input.work ??
    buildContextWorkState({
      contextEventId,
      event: input.event,
      workstream: input.workstream,
    });
  const session = input.session ?? null;
  const events = input.workstream?.events ?? [];

  const slotCompleted: AgentExecStep[] = work.completed.map((slot) => ({
    id: `slot:${slot}`,
    labelKo: CONTEXT_WORK_SLOT_LABEL_KO[slot],
    status: "done" as const,
  }));

  const sessionDone = (session?.steps ?? []).filter((s) => s.status === "done");
  const sessionRunning =
    (session?.steps ?? []).find((s) => s.status === "running") ?? null;

  const completedSteps = [...slotCompleted, ...sessionDone].slice(-8);

  const runningStep: AgentExecStep | null =
    sessionRunning ??
    (work.inProgress
      ? {
          id: `slot:${work.inProgress}`,
          labelKo: CONTEXT_WORK_SLOT_LABEL_KO[work.inProgress],
          status: "running",
        }
      : null);

  const nextFromWork = work.nextActions.map((a) => ({
    id: a.id,
    labelKo: a.labelKo,
    status: "pending" as const,
  }));
  const nextFromSession = (session?.nextHints ?? []).map((labelKo, i) => ({
    id: `hint:${i}`,
    labelKo,
    status: "pending" as const,
  }));
  const nextSteps = (nextFromSession.length > 0 ? nextFromSession : nextFromWork).slice(
    0,
    4,
  );

  const timeline: RealityTimelineEntry[] = events
    .slice(-12)
    .map((e) => ({
      id: e.id,
      atIso: e.atIso,
      labelKo: e.labelKo?.trim() || EVENT_LABEL[e.kind],
      kind: timelineKind(e.kind),
    }))
    .reverse();

  if (session?.healEntries?.length) {
    for (const h of session.healEntries.slice(-3)) {
      timeline.unshift({
        id: h.id,
        atIso: h.atIso,
        labelKo: h.labelKo,
        kind: "heal",
      });
    }
  }

  const sessionHealed = (session?.steps ?? []).filter(
    (s) => s.status === "healed",
  );
  const autoFromPlan = (session?.recoveryPlan ?? []).map((p, i) => ({
    id: `auto-plan:${i}`,
    labelKo: p.labelKo,
    status: "healed" as const,
  }));
  const autoFromHeal = (session?.healEntries ?? []).map((h) => ({
    id: h.id,
    labelKo: h.labelKo,
    status: "healed" as const,
    atIso: h.atIso,
  }));
  const autoResolved = [...autoFromHeal, ...sessionHealed, ...autoFromPlan].slice(
    -6,
  );

  const taskGraph = buildContextTaskGraph({
    contextEventId,
    event: input.event,
    workstream: input.workstream,
    work,
  });

  const goal =
    readContextGoalState(contextEventId) ??
    syncContextGoalState({
      contextEventId,
      event: input.event,
      workstream: input.workstream,
    });

  return {
    contextEventId,
    currentTaskKo: work.title,
    goalKo: goal.goalKo,
    status: workStatusToExec(work, session),
    percent: goal.percent,
    completedSteps,
    runningStep,
    nextSteps,
    autoResolved,
    timeline: timeline.slice(0, 10),
    commitStatus: session?.commitStatus ?? "none",
    errorState: session?.errorState ?? null,
    recoveryPlan: session?.recoveryPlan ?? null,
    liveHeadlineKo:
      session?.headlineKo ??
      (runningStep ? `${runningStep.labelKo} 중…` : null),
    taskGraph,
  };
}

export function formatTimelineClock(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export const AGENT_EXECUTION_STATUS_LABEL_KO: Record<
  AgentExecutionStatus,
  string
> = {
  idle: "대기",
  building: "Building",
  optimizing: "최적화",
  committing: "Commit 중",
  healing: "자동 수정",
  awaiting_commit: "확정 대기",
};
