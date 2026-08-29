"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  ChevronRight,
  FileText,
  FolderOpen,
  Globe,
  Laptop,
  Mic,
  Plane,
  Settings,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { copy } from "@/lib/copy/human-ko";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { formatRelativeKo } from "@/lib/time/format-relative-ko";
import type { AgentHomeModeId } from "@/lib/agent/agent-home-tokens";
import { AgentHubDiscoveryPanel } from "@/components/agent/agent-hub-discovery-panel";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type AgentHomeDashboardProps = {
  onSubmit: (text: string, mode: AgentHomeModeId) => void;
  onSelectEvent: (eventId: string) => void;
  activeEventId: string | null;
  onOpenSettings?: () => void;
};

type RecommendedTask = {
  id: string;
  title: string;
  hint: string;
  seed: string;
  icon: typeof Plane;
  iconBg: string;
};

const MODES: {
  id: AgentHomeModeId;
  label: string;
  icon: typeof Sparkles;
}[] = [
  { id: "auto", label: copy.globe.agentHomeModeAuto, icon: Sparkles },
  { id: "web", label: copy.globe.agentHomeModeWeb, icon: Globe },
  { id: "pc", label: copy.globe.agentHomeModePc, icon: Laptop },
  { id: "file", label: copy.globe.agentHomeModeFile, icon: FileText },
  { id: "data", label: copy.globe.agentHomeModeData, icon: BarChart3 },
];

const RECOMMENDED: RecommendedTask[] = [
  {
    id: "travel",
    title: copy.globe.agentHomeTaskTravel,
    hint: copy.globe.agentHomeTaskTravelHint,
    seed: copy.globe.agentHomeTaskTravelSeed,
    icon: Plane,
    iconBg: "bg-[#eef2ff] text-[#6366f1]",
  },
  {
    id: "shopping",
    title: copy.globe.agentHomeTaskShopping,
    hint: copy.globe.agentHomeTaskShoppingHint,
    seed: copy.globe.agentHomeTaskShoppingSeed,
    icon: ShoppingBag,
    iconBg: "bg-[#fff7ed] text-[#ea580c]",
  },
  {
    id: "pc",
    title: copy.globe.agentHomeTaskPcCleanup,
    hint: copy.globe.agentHomeTaskPcCleanupHint,
    seed: copy.globe.agentHomeTaskPcCleanupSeed,
    icon: FolderOpen,
    iconBg: "bg-[#ecfdf5] text-[#059669]",
  },
  {
    id: "doc",
    title: copy.globe.agentHomeTaskDocSummary,
    hint: copy.globe.agentHomeTaskDocSummaryHint,
    seed: copy.globe.agentHomeTaskDocSummarySeed,
    icon: FileText,
    iconBg: "bg-[#faf5ff] text-[#9333ea]",
  },
];

function readModePrefix(mode: AgentHomeModeId, text: string): string {
  const trimmed = text.trim();
  if (!trimmed || mode === "auto") {
    return trimmed;
  }
  const prefixes: Record<Exclude<AgentHomeModeId, "auto">, string> = {
    web: "[웹 검색] ",
    pc: "[PC 작업] ",
    file: "[파일 분석] ",
    data: "[데이터 분석] ",
  };
  const prefix = prefixes[mode];
  if (trimmed.startsWith(prefix.trim())) {
    return trimmed;
  }
  return `${prefix}${trimmed}`;
}

function readEventIcon(title: string) {
  const lower = title.toLowerCase();
  if (/여행|오사카|도쿄|항공|trip|travel/.test(lower)) {
    return Plane;
  }
  if (/쇼핑|가격|구매|shop/.test(lower)) {
    return ShoppingBag;
  }
  if (/pdf|문서|요약|doc/.test(lower)) {
    return FileText;
  }
  return FolderOpen;
}

export function AgentHomeDashboard({
  onSubmit,
  onSelectEvent,
  activeEventId,
  onOpenSettings,
}: AgentHomeDashboardProps) {
  const { tokens } = useAgentHomeThemeContext();
  const { user } = useAuth();
  const [mode, setMode] = useState<AgentHomeModeId>("auto");
  const [draft, setDraft] = useState("");
  const [recentTick, setRecentTick] = useState(0);

  useEffect(() => {
    const bump = () => setRecentTick((v) => v + 1);
    window.addEventListener("rimvio-life-events-updated", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("rimvio-life-events-updated", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const displayName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Guest";

  const recent = useMemo(() => {
    void recentTick;
    return listLifeEventCandidates()
      .filter((e) => e.title?.trim())
      .slice(0, 6);
  }, [recentTick]);

  const handleSubmit = useCallback(() => {
    const text = readModePrefix(mode, draft);
    if (!text.trim()) {
      return;
    }
    onSubmit(text, mode);
    setDraft("");
  }, [draft, mode, onSubmit]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rimvio-scroll-touch">
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 md:px-8",
          tokens.panel,
          tokens.panelBorder,
        )}
      >
        <h1 className={cn("text-[15px] font-semibold tracking-[-0.02em] md:text-[17px]", tokens.text)}>
          {copy.globe.agentHomeGreetingUser(displayName)}
        </h1>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex",
              "bg-[#ecfdf5] text-[#059669]",
            )}
          >
            <span className="size-1.5 rounded-full bg-[#10b981]" />
            {copy.globe.agentHomeOnlineStatus}
          </span>
          <button
            type="button"
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors",
              tokens.badge,
              "hover:opacity-80",
            )}
            aria-label="Notifications"
          >
            <Bell className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors",
              tokens.badge,
              "hover:opacity-80",
            )}
            aria-label={copy.globe.agentHomeSidebarSettings}
          >
            <Settings className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-90",
              tokens.accent,
            )}
          >
            {copy.globe.agentHomeUpgradePro}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[920px] flex-1 flex-col px-4 pb-8 pt-6 md:px-8 md:pt-8">
        <div
          className={cn(
            "rounded-2xl border p-4 transition-shadow md:p-5",
            tokens.input,
          )}
        >
          <p className={cn("mb-3 text-[15px] font-medium md:text-[16px]", tokens.text)}>
            {copy.globe.agentHomeGreeting}
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={2}
            placeholder={copy.globe.agentHomeComposerPlaceholder}
            className={cn(
              "w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-[#9ca3af]",
              tokens.text,
            )}
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {MODES.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                    active
                      ? "border-[#6366f1] bg-[#6366f1] text-white"
                      : cn(
                          "border-transparent",
                          tokens.badge,
                          "hover:border-[#e5e7eb]",
                        ),
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                  {item.label}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border border-[#e5e7eb] transition-colors",
                  tokens.badge,
                  "hover:border-[#d1d5db]",
                )}
                aria-label="Voice"
              >
                <Mic className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!draft.trim()}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[12px] font-semibold transition-opacity disabled:opacity-40",
                  tokens.accent,
                )}
              >
                {copy.globe.agentHomeExecute}
              </button>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className={cn("mb-4 text-[13px] font-semibold", tokens.text)}>
            {copy.globe.agentHomeSectionRecommended}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {RECOMMENDED.map((task) => {
              const Icon = task.icon;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSubmit(task.seed, "auto")}
                  className={cn(
                    "group flex flex-col rounded-2xl border p-4 text-left transition-all duration-200",
                    tokens.card,
                    tokens.cardHover,
                    "-translate-y-0 hover:-translate-y-0.5",
                  )}
                >
                  <span
                    className={cn(
                      "mb-4 flex size-11 items-center justify-center rounded-xl",
                      task.iconBg,
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className={cn("text-[13px] font-semibold leading-snug", tokens.text)}>
                    {task.title}
                  </span>
                  <span className={cn("mt-1 text-[11px] leading-snug", tokens.textSubtle)}>
                    {task.hint}
                  </span>
                  <ChevronRight
                    className={cn(
                      "mt-3 size-3.5 opacity-0 transition-opacity group-hover:opacity-60",
                      tokens.textSubtle,
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </section>

        <AgentHubDiscoveryPanel
          className="mt-10"
          onTryUtterance={(text) => onSubmit(text, "auto")}
        />

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className={cn("text-[13px] font-semibold", tokens.text)}>
              {copy.globe.agentHomeSectionRecent}
            </h2>
            {recent.length > 0 ? (
              <button
                type="button"
                className={cn("text-[11px] font-medium hover:underline", tokens.textSubtle)}
              >
                {copy.globe.agentHomeViewAll}
              </button>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <p className={cn("text-[12px]", tokens.textSubtle)}>
              {copy.globe.agentHomeSidebarEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-[#e5e7eb] rounded-xl border border-[#e5e7eb] bg-white">
              {recent.map((event) => {
                const inProgress = event.id === activeEventId;
                const Icon = readEventIcon(event.title);
                const timestamp = formatRelativeKo(event.updatedAt || event.createdAt);
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(event.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f9fafb]",
                        inProgress && "bg-[#f5f3ff]/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          inProgress
                            ? "bg-[#eef2ff] text-[#6366f1]"
                            : tokens.badge,
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-[13px] font-medium",
                            tokens.text,
                          )}
                        >
                          {event.title}
                        </span>
                        {inProgress ? (
                          <span className="mt-1.5 block">
                            <span className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-[#6366f1]">
                                {copy.globe.agentHomeStatusInProgress}
                              </span>
                              <span className={cn("text-[10px]", tokens.textSubtle)}>
                                75%
                              </span>
                            </span>
                            <span
                              className={cn(
                                "block h-1 overflow-hidden rounded-full",
                                tokens.progressTrack,
                              )}
                            >
                              <span
                                className="block h-full rounded-full bg-[#6366f1] transition-all"
                                style={{ width: "75%" }}
                              />
                            </span>
                          </span>
                        ) : (
                          <span className={cn("mt-0.5 block text-[10px]", tokens.textSubtle)}>
                            {timestamp}
                          </span>
                        )}
                      </span>
                      {!inProgress ? (
                        <span className="shrink-0 text-[10px] font-medium text-[#10b981]">
                          {copy.globe.agentHomeStatusCompleted}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
