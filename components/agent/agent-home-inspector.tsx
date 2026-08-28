"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Check, Circle, Loader2, Plane, ShoppingBag, Zap } from "lucide-react";
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

function sessionProgress(session: AgentExecutionSession | null): number {
  if (!session?.steps.length) {
    return session?.statusHint === "running" ? 32 : 0;
  }
  const done = session.steps.filter((s) => s.status === "done").length;
  return Math.round((done / session.steps.length) * 100);
}

const HUB_CARDS: {
  id: AgentHomeMarketHubId;
  title: string;
  icon: typeof ShoppingBag;
  color: string;
  popularity: string;
}[] = [
  {
    id: "shopping",
    title: copy.globe.agentHomeHubShopping,
    icon: ShoppingBag,
    color: "text-[#ea580c]",
    popularity: "12.4K",
  },
  {
    id: "travel",
    title: copy.globe.agentHomeHubTravel,
    icon: Plane,
    color: "text-[#6366f1]",
    popularity: "8.7K",
  },
  {
    id: "work",
    title: copy.globe.agentHomeHubWork,
    icon: Briefcase,
    color: "text-[#059669]",
    popularity: "5.3K",
  },
];

const DEFAULT_CAPABILITIES = [
  { id: "search", name: "가격 비교 검색", provider: "Rimvio", score: "9.8" },
  { id: "pdf", name: "PDF 분석기", provider: "Rimvio", score: "9.6" },
];

const PRO_FEATURES = [
  copy.globe.agentHomeProFeature1,
  copy.globe.agentHomeProFeature2,
  copy.globe.agentHomeProFeature3,
  copy.globe.agentHomeProFeature4,
];

function ExecutionWaveform({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "agent-home-waveform",
        !active && "agent-home-waveform--idle",
      )}
      aria-hidden
    >
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function StepIcon({ status }: { status: "done" | "running" | "pending" }) {
  if (status === "done") {
    return <Check className="size-3 text-[#10b981]" aria-hidden />;
  }
  if (status === "running") {
    return <Loader2 className="size-3 animate-spin text-[#6366f1]" aria-hidden />;
  }
  return <Circle className="size-2.5 text-[#d1d5db]" aria-hidden />;
}

export type AgentHomeInspectorProps = {
  activeEventId?: string | null;
  onTravelCompose?: (seedText: string) => void;
};

export function AgentHomeInspector({
  activeEventId = null,
  onTravelCompose,
}: AgentHomeInspectorProps) {
  const { tokens } = useAgentHomeThemeContext();
  const { activeTask, installedCapabilities } = usePcLocalAgent();
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

  const isRunning = Boolean(
    session?.statusHint === "running" ||
      session?.statusHint === "committing" ||
      pcTaskLabel,
  );

  const headline = session?.headlineKo || pcTaskLabel;
  const progress = pcTaskLabel ? pcProgress : sessionProgress(session);

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

  const steps = useMemo(() => {
    if (session?.steps.length) {
      return session.steps.slice(0, 5);
    }
    if (!isRunning) {
      return [];
    }
    return [];
  }, [isRunning, session?.steps]);

  return (
    <aside
      className={cn(
        "hidden w-[300px] shrink-0 flex-col border-l xl:flex",
        tokens.sidebarBorder,
        tokens.panel,
      )}
      data-agent-home-inspector
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 rimvio-scroll-touch">
        <section>
          <h2 className={cn("mb-3 text-[12px] font-semibold", tokens.text)}>
            {copy.globe.agentHomeInspectorExecution}
          </h2>
          <div className={cn("rounded-2xl border p-4", tokens.card)}>
            <ExecutionWaveform active={isRunning} />
            {!isRunning ? (
              <div className="mt-2 text-center">
                <p className={cn("text-[12px] font-medium", tokens.text)}>
                  {copy.globe.agentHomeInspectorIdle}
                </p>
                <p className={cn("mt-1 text-[11px]", tokens.textSubtle)}>
                  {copy.globe.agentHomeInspectorIdleHint}
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#6366f1]" />
                  <span className="text-[10px] font-semibold text-[#6366f1]">
                    {copy.globe.agentHomeInspectorRunning}
                  </span>
                </div>
                {headline ? (
                  <p className={cn("mb-2 text-[12px] font-semibold", tokens.text)}>
                    {headline}
                  </p>
                ) : null}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className={cn("text-[10px]", tokens.textSubtle)}>
                    {session?.nextHints[0] || "Planning..."}
                  </span>
                  <span className={cn("text-[10px] font-semibold", tokens.textMuted)}>
                    {progress}%
                  </span>
                </div>
                <div
                  className={cn(
                    "mb-3 h-1 overflow-hidden rounded-full",
                    tokens.progressTrack,
                  )}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {steps.length > 0 ? (
                  <ul className="space-y-1.5">
                    {steps.map((step) => (
                      <li
                        key={step.id}
                        className="flex items-center gap-2 text-[10px]"
                      >
                        <StepIcon
                          status={
                            step.status === "done"
                              ? "done"
                              : step.status === "running"
                                ? "running"
                                : "pending"
                          }
                        />
                        <span
                          className={cn(
                            step.status === "done"
                              ? tokens.textSubtle
                              : step.status === "running"
                                ? cn(tokens.text, "font-medium")
                                : tokens.textSubtle,
                          )}
                        >
                          {step.labelKo}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className={cn("mb-3 text-[12px] font-semibold", tokens.text)}>
            {copy.globe.agentHomeInspectorCapabilities}
          </h2>
          <ul className="space-y-2">
            {capabilities.map((cap) => (
              <li
                key={cap.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
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
                <span className="text-[10px] font-semibold text-[#f59e0b]">
                  ★ {cap.score}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className={cn("mb-3 text-[12px] font-semibold", tokens.text)}>
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
                      "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                      tokens.card,
                      tokens.cardHover,
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", hub.color)} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[11px] font-medium", tokens.text)}>
                        {hub.title}
                      </span>
                      <span className={cn("text-[10px]", tokens.textSubtle)}>
                        {copy.globe.agentHomeHubPopular} · {hub.popularity}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className={cn("border-t p-4", tokens.sidebarBorder)}>
        <div className="rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] p-4 text-white shadow-[0_8px_24px_rgba(99,102,241,0.25)]">
          <p className="text-[13px] font-semibold">{copy.globe.agentHomeProTitle}</p>
          <p className="mt-1 text-[11px] text-white/80">
            {copy.globe.agentHomeProSubtitle}
          </p>
          <ul className="mt-3 space-y-1">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-1.5 text-[10px] text-white/90">
                <Check className="size-3 shrink-0" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 w-full rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-[#4f46e5] transition-opacity hover:opacity-90"
          >
            {copy.globe.agentHomeProUpgrade}
          </button>
        </div>
      </div>
    </aside>
  );
}
