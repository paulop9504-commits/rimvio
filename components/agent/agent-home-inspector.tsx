"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Plane, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { copy } from "@/lib/copy/human-ko";
import {
  openAgentHomeMarketHub,
  type AgentHomeMarketHubId,
} from "@/lib/agent/agent-home-ingress";
import { usePcLocalAgent } from "@/hooks/use-pc-local-agent";
import {
  readAgentExecutionSession,
  subscribeAgentExecutionSession,
  type AgentExecutionSession,
} from "@/lib/workstream/agent-execution-session";
import { cn } from "@/lib/utils";

type ExecutionRow = {
  id: string;
  label: string;
  progress: number;
  tone: "pc" | "cloud" | "browser";
};

function sessionProgress(session: AgentExecutionSession | null): number {
  if (!session?.steps.length) {
    return session?.statusHint === "running" ? 32 : 0;
  }
  const done = session.steps.filter((s) => s.status === "done").length;
  return Math.round((done / session.steps.length) * 100);
}

function readExecutionRows(
  session: AgentExecutionSession | null,
  pcTaskLabel: string | null,
  pcProgress: number,
): ExecutionRow[] {
  const rows: ExecutionRow[] = [];
  if (pcTaskLabel) {
    rows.push({
      id: "pc",
      label: pcTaskLabel,
      progress: pcProgress,
      tone: "pc",
    });
  }
  if (session?.headlineKo) {
    rows.push({
      id: "cloud",
      label: session.headlineKo,
      progress: sessionProgress(session),
      tone: "cloud",
    });
  } else if (session?.statusHint === "running") {
    rows.push({
      id: "cloud",
      label: copy.globe.agentHomeInspectorExecution,
      progress: sessionProgress(session),
      tone: "cloud",
    });
  }
  return rows.slice(0, 3);
}

const HUB_CARDS: {
  id: AgentHomeMarketHubId;
  title: string;
  icon: typeof ShoppingBag;
  color: string;
}[] = [
  {
    id: "shopping",
    title: copy.globe.agentHomeHubShopping,
    icon: ShoppingBag,
    color: "text-[#f4511e]",
  },
  {
    id: "travel",
    title: copy.globe.agentHomeHubTravel,
    icon: Plane,
    color: "text-[#4f6bf6]",
  },
  {
    id: "work",
    title: copy.globe.agentHomeHubWork,
    icon: Briefcase,
    color: "text-[#00897b]",
  },
];

const DEFAULT_CAPABILITIES = [
  { id: "search", name: "가격 비교 검색", provider: "Rimvio", score: "9.8" },
  { id: "pdf", name: "PDF 분석기", provider: "Rimvio", score: "9.6" },
];

export type AgentHomeInspectorProps = {
  activeEventId?: string | null;
  onTravelCompose?: (seedText: string) => void;
};

export function AgentHomeInspector({
  activeEventId = null,
  onTravelCompose,
}: AgentHomeInspectorProps) {
  const { tokens } = useAgentHomeThemeContext();
  const { onlineDevice, activeTask, installedCapabilities } = usePcLocalAgent();
  const [session, setSession] = useState<AgentExecutionSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(readAgentExecutionSession());
    sync();
    return subscribeAgentExecutionSession(sync);
  }, []);

  const pcProgress = useMemo(() => {
    if (!activeTask) {
      return 0;
    }
    if (activeTask.status === "COMPLETED") {
      return 100;
    }
    if (
      activeTask.status === "DISPATCHED" ||
      activeTask.status === "RUNNING" ||
      activeTask.status === "ACTION_RUNNING"
    ) {
      return 65;
    }
    return 32;
  }, [activeTask]);

  const pcTaskLabel = useMemo(() => {
    if (!activeTask) {
      return null;
    }
    const payload = activeTask.payload;
    return payload.title?.trim() || payload.query?.trim() || copy.globe.agentHomeTaskPcCleanup;
  }, [activeTask]);

  const executionRows = useMemo(
    () => readExecutionRows(session, pcTaskLabel, pcProgress),
    [pcTaskLabel, pcProgress, session],
  );

  const capabilities = useMemo(() => {
    if (installedCapabilities.length > 0) {
      return installedCapabilities.slice(0, 3).map((cap) => ({
        id: cap.capability_id,
        name: cap.name,
        provider: "PC Agent",
        score: cap.version,
      }));
    }
    return DEFAULT_CAPABILITIES;
  }, [installedCapabilities]);

  return (
    <aside
      className={cn(
        "hidden w-[280px] shrink-0 flex-col border-l xl:flex",
        tokens.sidebarBorder,
        tokens.panel,
      )}
      data-agent-home-inspector
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 rimvio-scroll-touch">
        <section>
          <h2 className={cn("mb-2.5 text-[11px] font-semibold", tokens.textMuted)}>
            {copy.globe.agentHomeInspectorExecution}
          </h2>
          {executionRows.length === 0 ? (
            <p className={cn("rounded-xl px-2 py-3 text-[11px]", tokens.badge)}>
              {copy.globe.agentHomeInspectorIdle}
            </p>
          ) : (
            <ul className="space-y-2">
              {executionRows.map((row) => (
                <li
                  key={row.id}
                  className={cn("rounded-xl border p-2.5", tokens.card)}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className={cn("truncate text-[11px] font-medium", tokens.text)}>
                      {row.label}
                    </span>
                    <span className={cn("text-[10px] font-semibold", tokens.textSubtle)}>
                      {row.progress}%
                    </span>
                  </div>
                  <div
                    className={cn(
                      "h-1.5 overflow-hidden rounded-full",
                      tokens.progressTrack,
                    )}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7b61ff] to-[#4593fc] transition-all"
                      style={{ width: `${row.progress}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h2 className={cn("mb-2.5 text-[11px] font-semibold", tokens.textMuted)}>
            {copy.globe.agentHomeInspectorCapabilities}
          </h2>
          <ul className="space-y-1.5">
            {capabilities.map((cap) => (
              <li
                key={cap.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2",
                  tokens.card,
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    tokens.accentSoft,
                  )}
                >
                  <Zap className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[11px] font-semibold", tokens.text)}>
                    {cap.name}
                  </span>
                  <span className={cn("text-[10px]", tokens.textSubtle)}>
                    {cap.provider}
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-[#f5a623]">
                  ★ {cap.score}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className={cn("mb-2.5 text-[11px] font-semibold", tokens.textMuted)}>
            {copy.globe.agentHomeInspectorHub}
          </h2>
          <ul className="space-y-1.5">
            {HUB_CARDS.map((hub) => {
              const Icon = hub.icon;
              return (
                <li key={hub.id}>
                  <button
                    type="button"
                    onClick={() =>
                      openAgentHomeMarketHub(hub.id, {
                        primaryEventId: activeEventId,
                        onTravelCompose,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors",
                      tokens.card,
                      tokens.cardHover,
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", hub.color)} aria-hidden />
                    <span className={cn("text-[11px] font-medium", tokens.text)}>
                      {hub.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className={cn("border-t px-3 py-3", tokens.sidebarBorder)}>
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2",
            tokens.card,
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-lg",
                tokens.accentSoft,
              )}
            >
              <Sparkles className="size-3.5" aria-hidden />
            </span>
            <span className={cn("text-[11px] font-semibold", tokens.text)}>
              {copy.globe.agentHomeInspectorPro}
            </span>
          </div>
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold",
              tokens.badge,
            )}
          >
            {copy.globe.agentHomeInspectorProManage}
          </button>
        </div>
        <p className={cn("mt-2 px-1 text-[10px]", tokens.textSubtle)}>
          {onlineDevice
            ? copy.globe.agentHomeSidebarPcConnected
            : copy.globe.agentHomeSidebarPcOffline}
        </p>
      </div>
    </aside>
  );
}
