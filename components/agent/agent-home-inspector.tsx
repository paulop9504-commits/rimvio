"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Circle,
  Loader2,
  MessageSquare,
  Network,
} from "lucide-react";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { copy } from "@/lib/copy/human-ko";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { formatRelativeKo } from "@/lib/time/format-relative-ko";
import { usePcLocalAgent } from "@/hooks/use-pc-local-agent";
import {
  readSharedAgentEventLog,
  subscribeSharedAgentEventLog,
  activityEventsFromLog,
} from "@/lib/agent/events";
import { AgentActivityPanel } from "@/components/agent/agent-activity-panel";
import {
  readAgentExecutionSession,
  subscribeAgentExecutionSession,
  type AgentExecutionSession,
} from "@/lib/workstream/agent-execution-session";
import { cn } from "@/lib/utils";

type PlanningStep = {
  readonly id: string;
  readonly label: string;
  readonly status: "done" | "running" | "pending";
};

const DEFAULT_PLANNING: readonly PlanningStep[] = [
  { id: "1", label: copy.globe.agentHomePlanningStep1, status: "done" },
  { id: "2", label: copy.globe.agentHomePlanningStep2, status: "running" },
  { id: "3", label: copy.globe.agentHomePlanningStep3, status: "pending" },
  { id: "4", label: copy.globe.agentHomePlanningStep4, status: "pending" },
];

function sessionProgress(session: AgentExecutionSession | null): number {
  if (!session?.steps.length) {
    return session?.statusHint === "running" ? 32 : 0;
  }
  const done = session.steps.filter((s) => s.status === "done").length;
  return Math.round((done / session.steps.length) * 100);
}

function StepBadge({ status }: { status: PlanningStep["status"] }) {
  if (status === "done") {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-[#ecfdf5]">
        <Check className="size-2.5 text-[#10b981]" aria-hidden />
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-[#eef2ff]">
        <Loader2 className="size-2.5 animate-spin text-[#6366f1]" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-[#f3f4f6]">
      <Circle className="size-2 text-[#d1d5db]" aria-hidden />
    </span>
  );
}

export type AgentHomeInspectorProps = {
  activeEventId?: string | null;
  onTravelCompose?: (seedText: string) => void;
};

export function AgentHomeInspector({
  activeEventId = null,
  onTravelCompose: _onTravelCompose,
}: AgentHomeInspectorProps) {
  const { tokens } = useAgentHomeThemeContext();
  const { activeTask } = usePcLocalAgent();
  const [session, setSession] = useState<AgentExecutionSession | null>(null);
  const [recentTick, setRecentTick] = useState(0);
  const [agentEventLog, setAgentEventLog] = useState(() => readSharedAgentEventLog());

  useEffect(() => {
    const sync = () => setAgentEventLog(readSharedAgentEventLog());
    return subscribeSharedAgentEventLog(sync);
  }, []);

  useEffect(() => {
    const sync = () => setSession(readAgentExecutionSession());
    sync();
    return subscribeAgentExecutionSession(sync);
  }, []);

  useEffect(() => {
    const bump = () => setRecentTick((v) => v + 1);
    window.addEventListener("rimvio-life-events-updated", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("rimvio-life-events-updated", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const recentChats = useMemo(() => {
    void recentTick;
    return listLifeEventCandidates()
      .filter((e) => e.title?.trim())
      .slice(0, 3);
  }, [recentTick]);

  const pcTaskLabel = useMemo(() => {
    if (!activeTask) {
      return null;
    }
    const payload = activeTask.payload;
    return payload.title?.trim() || payload.query?.trim() || null;
  }, [activeTask]);

  const isRunning = Boolean(
    session?.statusHint === "running" ||
      session?.statusHint === "committing" ||
      pcTaskLabel,
  );

  const headline = session?.headlineKo || pcTaskLabel;
  const progress = sessionProgress(session);

  const planningSteps: PlanningStep[] = useMemo(() => {
    const activity = activityEventsFromLog(agentEventLog);
    if (activity.length >= 2) {
      return activity.slice(-4).map((event, index) => ({
        id: event.id,
        label: event.label,
        status:
          event.kind === "completed" || event.kind === "verification"
            ? "done"
            : index === activity.length - 1
              ? "running"
              : "pending",
      }));
    }
    if (session?.steps.length) {
      return session.steps.slice(0, 4).map((step, index) => ({
        id: step.id,
        label: step.labelKo,
        status:
          step.status === "done"
            ? "done"
            : step.status === "running"
              ? "running"
              : index === 0
                ? "running"
                : "pending",
      }));
    }
    return [...DEFAULT_PLANNING];
  }, [session?.steps, agentEventLog]);

  return (
    <aside
      className={cn(
        "hidden w-[240px] shrink-0 flex-col border-l lg:flex",
        tokens.sidebarBorder,
        tokens.panel,
      )}
      data-agent-home-inspector
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 rimvio-scroll-touch">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className={cn("text-[11px] font-semibold", tokens.text)}>
              {copy.globe.agentHomeInspectorRecentChats}
            </h2>
            <button
              type="button"
              className={cn("text-[9px] font-medium hover:underline", tokens.textSubtle)}
            >
              {copy.globe.agentHomeViewAllArrow}
            </button>
          </div>
          {recentChats.length === 0 ? (
            <p className={cn("rounded-lg border px-2.5 py-3 text-center text-[10px]", tokens.card, tokens.textSubtle)}>
              {copy.globe.agentHomeSidebarEmpty}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {recentChats.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full gap-2 rounded-lg border px-2 py-2 text-left transition-colors",
                      tokens.card,
                      event.id === activeEventId && tokens.accentSoft,
                      tokens.cardHover,
                    )}
                  >
                    <MessageSquare className="mt-0.5 size-3 shrink-0 text-[#6366f1]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[10px] font-semibold", tokens.text)}>
                        {event.title}
                      </span>
                      <span className={cn("mt-0.5 block truncate text-[9px]", tokens.textSubtle)}>
                        {copy.globe.agentHomeInspectorChatSnippet}
                      </span>
                      <span className={cn("mt-0.5 block text-[8px]", tokens.textSubtle)}>
                        {formatRelativeKo(event.updatedAt || event.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className={cn("text-[11px] font-semibold", tokens.text)}>
              Activity
            </h2>
          </div>
          <div className={cn("rounded-xl border", tokens.card)}>
            <AgentActivityPanel
              log={agentEventLog}
              emptyLabel="Hub Operator · Globe Agent 이벤트가 여기 동기화됩니다"
              className="max-h-[140px] overflow-y-auto rimvio-scroll-touch"
            />
          </div>
        </section>

        <section className="mt-4">
          <div className={cn("rounded-xl border p-2.5", tokens.card)}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className={cn("text-[11px] font-semibold", tokens.text)}>
                {copy.globe.agentHomeTitle}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-1.5 py-px text-[8px] font-bold text-[#059669]">
                <span className="size-1 rounded-full bg-[#10b981]" />
                {copy.globe.agentHomeInspectorActive}
              </span>
            </div>

            {isRunning && headline ? (
              <p className={cn("mb-2 text-[10px] font-medium leading-snug", tokens.textMuted)}>
                {headline}
              </p>
            ) : null}

            <ul className="space-y-1.5">
              {planningSteps.map((step) => (
                <li key={step.id} className="flex items-center gap-2">
                  <StepBadge status={isRunning ? step.status : step.status === "running" ? "pending" : step.status} />
                  <span
                    className={cn(
                      "text-[9px]",
                      step.status === "running" && isRunning
                        ? cn(tokens.text, "font-medium")
                        : step.status === "done"
                          ? tokens.textSubtle
                          : tokens.textSubtle,
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>

            {isRunning ? (
              <div className="mt-2">
                <div className={cn("h-1 overflow-hidden rounded-full", tokens.progressTrack)}>
                  <div
                    className="h-full rounded-full bg-[#6366f1] transition-all"
                    style={{ width: `${Math.max(progress, 25)}%` }}
                  />
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className={cn(
                "mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg border border-[#e5e7eb] py-1.5 text-[9px] font-medium transition-colors hover:bg-[#fafafa]",
                tokens.textMuted,
              )}
            >
              {copy.globe.agentHomeInspectorViewTaskStatus}
              <ArrowRight className="size-2.5" aria-hidden />
            </button>
          </div>
        </section>
      </div>

      <div className={cn("border-t p-3", tokens.sidebarBorder)}>
        <Link
          href="/hub"
          className={cn(
            "flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors hover:bg-[#fafafa]",
            tokens.card,
          )}
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#eef2ff] text-[#6366f1]">
            <Network className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block text-[10px] font-semibold", tokens.text)}>
              {copy.globe.agentHomeHubPromoTitle}
            </span>
            <span className={cn("block text-[9px]", tokens.textSubtle)}>
              {copy.globe.agentHomeHubPromoHint}
            </span>
          </span>
          <ArrowRight className={cn("size-3 shrink-0", tokens.textSubtle)} aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
