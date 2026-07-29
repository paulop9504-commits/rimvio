/**
 * Context Task Graph — decompose goal into executable units (ADR-040).
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CONTEXT_WORK_SLOT_LABEL_KO,
  type ContextWorkSlotId,
  type ContextWorkState,
} from "@/lib/workstream/context-work-state";
import { buildContextWorkState } from "@/lib/workstream/sync-context-work-state";
import type { WorkstreamState } from "@/lib/workstream/types";

export type ContextTaskNodeStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "skipped";

export type ContextTaskNode = {
  readonly id: string;
  readonly labelKo: string;
  readonly status: ContextTaskNodeStatus;
  readonly order: number;
};

export type ContextTaskGraph = {
  readonly contextEventId: string;
  readonly goalKo: string;
  readonly currentContextKo: string;
  readonly tasks: readonly ContextTaskNode[];
};

const TRIP_TASK_ORDER: readonly {
  id: string;
  labelKo: string;
  slot?: ContextWorkSlotId;
}[] = [
  { id: "dates", labelKo: "여행 기간 확인", slot: "dates" },
  { id: "lodging", labelKo: "숙소 Context 생성", slot: "lodging" },
  { id: "route", labelKo: "이동 경로 계산", slot: "route" },
  { id: "schedule", labelKo: "일정 생성", slot: "route" },
  { id: "food", labelKo: "맛집 · 예약 후보 탐색", slot: "food" },
  { id: "verify", labelKo: "최종 검증" },
];

function statusForTask(input: {
  readonly taskId: string;
  readonly slot: ContextWorkSlotId | undefined;
  readonly filled: ReadonlySet<ContextWorkSlotId>;
  readonly inProgress: ContextWorkSlotId | null;
  readonly percent: number;
  readonly awaitingCommit: boolean;
}): ContextTaskNodeStatus {
  if (input.taskId === "verify") {
    if (input.percent >= 100) return "done";
    if (input.awaitingCommit) return "running";
    return "pending";
  }
  if (input.taskId === "schedule") {
    if (input.filled.has("route")) return "done";
    if (input.inProgress === "route") return "running";
    return "pending";
  }
  if (input.slot && input.filled.has(input.slot)) return "done";
  if (input.slot && input.inProgress === input.slot) return "running";
  return "pending";
}

/**
 * Build Task Graph from Work State (Osaka Trip Complete pattern).
 */
export function buildContextTaskGraph(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly workstream?: WorkstreamState | null;
  readonly work?: ContextWorkState | null;
  readonly goalKo?: string;
}): ContextTaskGraph {
  const contextEventId = input.contextEventId.trim();
  const work =
    input.work ??
    buildContextWorkState({
      contextEventId,
      event: input.event,
      workstream: input.workstream,
    });

  const filled = new Set(work.completed);
  const awaitingCommit = work.status === "awaiting_commit";

  const tasks: ContextTaskNode[] = TRIP_TASK_ORDER.map((t, order) => ({
    id: t.id,
    labelKo: t.labelKo,
    order,
    status: statusForTask({
      taskId: t.id,
      slot: t.slot,
      filled,
      inProgress: work.inProgress,
      percent: work.percent,
      awaitingCommit,
    }),
  }));

  return {
    contextEventId,
    goalKo: input.goalKo?.trim() || `${work.title} 완료`,
    currentContextKo: work.title,
    tasks,
  };
}

export function formatTaskGraphBrief(graph: ContextTaskGraph): string {
  const lines = [
    `Goal: ${graph.goalKo}`,
    `Context: ${graph.currentContextKo}`,
    "Tasks:",
    ...graph.tasks.map((t, i) => {
      const mark =
        t.status === "done" ? "✓" : t.status === "running" ? "◉" : "○";
      return `  ${i + 1}. ${mark} ${t.labelKo}`;
    }),
  ];
  return lines.join("\n");
}

export function taskLabelForSlot(slotId: string): string {
  if (slotId in CONTEXT_WORK_SLOT_LABEL_KO) {
    return CONTEXT_WORK_SLOT_LABEL_KO[
      slotId as keyof typeof CONTEXT_WORK_SLOT_LABEL_KO
    ];
  }
  return slotId;
}
