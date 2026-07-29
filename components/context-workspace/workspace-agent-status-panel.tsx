"use client";

/**
 * Reality IDE — Agent Status Panel (ADR-039 · ADR-040).
 * Cursor-style: Current Task · Completed · Running · Next · Issue · Resolution.
 */

import { useEffect, useState } from "react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { subscribeContextWorkspaceUpdated } from "@/lib/context-workspace/workspace-store";
import { readWorkstream } from "@/lib/workstream/workstream-store";
import {
  AGENT_EXECUTION_STATUS_LABEL_KO,
  buildAgentExecutionState,
  formatTimelineClock,
  type AgentExecutionState,
} from "@/lib/workstream/build-agent-execution-state";
import {
  readAgentExecutionSession,
  subscribeAgentExecutionSession,
} from "@/lib/workstream/agent-execution-session";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceAgentStatusPanelProps = {
  contextEventId: string;
  onContinue: () => void;
  className?: string;
  busy?: boolean;
};

function progressBar(percent: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

export function WorkspaceAgentStatusPanel({
  contextEventId,
  onContinue,
  className,
  busy = false,
}: WorkspaceAgentStatusPanelProps) {
  const [state, setState] = useState<AgentExecutionState | null>(null);

  useEffect(() => {
    const id = contextEventId.trim();
    if (!id) {
      setState(null);
      return;
    }
    const refresh = () => {
      const event = findLifeEventCandidate(id);
      const workstream = readWorkstream(id);
      const session = readAgentExecutionSession();
      setState(
        buildAgentExecutionState({
          contextEventId: id,
          event,
          workstream,
          session: session?.contextEventId === id ? session : null,
        }),
      );
    };
    refresh();
    const unsubWs = subscribeContextWorkspaceUpdated((updatedId) => {
      if (updatedId === id) refresh();
    });
    const unsubSession = subscribeAgentExecutionSession(() => refresh());
    return () => {
      unsubWs();
      unsubSession();
    };
  }, [contextEventId]);

  if (
    !state ||
    (state.percent <= 0 && !state.liveHeadlineKo && state.timeline.length === 0)
  ) {
    return null;
  }

  const showContinue = state.nextSteps.length > 0;

  return (
    <div className={cn("mb-2 space-y-2", className)} data-workspace-agent-status>
      <div className="rounded-2xl bg-white/95 px-3 py-2.5 shadow-sm ring-1 ring-black/[0.05]">
        <p className="text-[10px] font-semibold tracking-wide text-[#3182f6]">
          {copy.globe.agentStatusTitle}
        </p>

        <div className="mt-1.5 space-y-1 text-[11px] leading-snug text-[#4e5968]">
          <div>
            <p className="font-medium text-[#8b95a1]">
              {copy.globe.agentCurrentTask}
            </p>
            <p className="text-[13px] font-semibold text-[#191f28]">
              {state.liveHeadlineKo || state.currentTaskKo}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <p>
              <span className="font-medium text-[#8b95a1]">
                {copy.globe.agentStatusLabel}
              </span>{" "}
              <span className="font-semibold text-[#191f28]">
                {AGENT_EXECUTION_STATUS_LABEL_KO[state.status]}
              </span>
            </p>
            <p className="font-semibold tabular-nums text-[#3182f6]">
              {copy.globe.agentProgressLabel} {state.percent}%
            </p>
          </div>

          <p className="font-mono text-[11px] tracking-tight text-[#3182f6]">
            {progressBar(state.percent)}
          </p>

          {state.completedSteps.length > 0 ? (
            <div className="pt-1">
              <p className="font-medium text-[#8b95a1]">
                {copy.globe.workspaceWorkDone}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {state.completedSteps.slice(-4).map((s) => (
                  <li key={s.id}>✓ {s.labelKo}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.runningStep ? (
            <div>
              <p className="font-medium text-[#8b95a1]">
                {copy.globe.workspaceWorkInProgress}
              </p>
              <p>◉ {state.runningStep.labelKo}</p>
            </div>
          ) : null}

          {state.autoResolved.length > 0 ? (
            <div>
              <p className="font-medium text-[#8b95a1]">
                {copy.globe.agentAutoResolved}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {state.autoResolved.slice(-3).map((s) => (
                  <li key={s.id}>✓ {s.labelKo}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.errorState ? (
            <div className="rounded-xl bg-[#fff5f5] px-2.5 py-1.5">
              <p className="font-medium text-[#e5484d]">
                {copy.globe.agentIssue}
              </p>
              <p className="text-[#e5484d]">{state.errorState.messageKo}</p>
            </div>
          ) : null}

          {state.recoveryPlan && state.recoveryPlan.length > 0 ? (
            <div>
              <p className="font-medium text-[#8b95a1]">
                {copy.globe.agentResolution}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {state.recoveryPlan.map((p) => (
                  <li key={p.labelKo}>✓ {p.labelKo}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.nextSteps.length > 0 ? (
            <div>
              <p className="font-medium text-[#8b95a1]">
                {copy.globe.agentNextAction}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {state.nextSteps.map((s) => (
                  <li key={s.id}>→ {s.labelKo}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.taskGraph.tasks.length > 0 ? (
            <div className="pt-1">
              <p className="font-medium text-[#8b95a1]">
                {copy.globe.agentTaskGraph}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {state.taskGraph.tasks.map((t) => {
                  const mark =
                    t.status === "done"
                      ? "✓"
                      : t.status === "running"
                        ? "◉"
                        : "○";
                  return (
                    <li key={t.id}>
                      {mark} {t.labelKo}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {showContinue ? (
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            className="mt-2.5 w-full rounded-xl bg-[#3182f6] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {copy.globe.workspaceWorkContinue}
          </button>
        ) : null}
      </div>

      {state.timeline.length > 0 ? (
        <div className="rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[10px] font-medium text-[#8b95a1]">
            {copy.globe.agentRealityTimeline}
          </p>
          <ul className="mt-1.5 max-h-28 space-y-1.5 overflow-y-auto">
            {state.timeline.slice(0, 5).map((entry) => (
              <li
                key={entry.id}
                className="flex gap-2 text-[11px] leading-snug text-[#4e5968]"
              >
                <span className="w-9 shrink-0 tabular-nums text-[#8b95a1]">
                  {formatTimelineClock(entry.atIso)}
                </span>
                <span className="min-w-0">
                  {entry.kind === "heal" ? "↺ " : ""}
                  {entry.labelKo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
