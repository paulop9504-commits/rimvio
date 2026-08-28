"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BarChart3,
  FileText,
  FolderOpen,
  Globe,
  Laptop,
  MapPin,
  Mic,
  Plane,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { copy } from "@/lib/copy/human-ko";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import type { AgentHomeModeId } from "@/lib/agent/agent-home-tokens";
import { cn } from "@/lib/utils";

export type AgentHomeDashboardProps = {
  onSubmit: (text: string, mode: AgentHomeModeId) => void;
  onSelectEvent: (eventId: string) => void;
  activeEventId: string | null;
};

type RecommendedTask = {
  id: string;
  title: string;
  hint: string;
  seed: string;
  icon: typeof Plane;
  accent: string;
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
    accent: "from-[#6b8afd] to-[#4f6bf6]",
  },
  {
    id: "shopping",
    title: copy.globe.agentHomeTaskShopping,
    hint: copy.globe.agentHomeTaskShoppingHint,
    seed: copy.globe.agentHomeTaskShoppingSeed,
    icon: ShoppingBag,
    accent: "from-[#ff8a65] to-[#f4511e]",
  },
  {
    id: "pc",
    title: copy.globe.agentHomeTaskPcCleanup,
    hint: copy.globe.agentHomeTaskPcCleanupHint,
    seed: copy.globe.agentHomeTaskPcCleanupSeed,
    icon: FolderOpen,
    accent: "from-[#4db6ac] to-[#00897b]",
  },
  {
    id: "doc",
    title: copy.globe.agentHomeTaskDocSummary,
    hint: copy.globe.agentHomeTaskDocSummaryHint,
    seed: copy.globe.agentHomeTaskDocSummarySeed,
    icon: FileText,
    accent: "from-[#ba68c8] to-[#8e24aa]",
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

export function AgentHomeDashboard({
  onSubmit,
  onSelectEvent,
  activeEventId,
}: AgentHomeDashboardProps) {
  const { tokens } = useAgentHomeThemeContext();
  const [mode, setMode] = useState<AgentHomeModeId>("auto");
  const [draft, setDraft] = useState("");

  const recent = useMemo(
    () =>
      listLifeEventCandidates()
        .filter((e) => e.title?.trim())
        .slice(0, 6),
    [],
  );

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
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-6 pt-8 md:px-6 md:pt-12">
        <div className="mb-8 text-center">
          <h1
            className={cn(
              "text-[26px] font-semibold tracking-[-0.03em] md:text-[32px]",
              tokens.text,
            )}
          >
            {copy.globe.agentHomeGreeting}
          </h1>
          <p className={cn("mt-1.5 text-[13px]", tokens.textSubtle)}>
            {copy.globe.agentHomeSubtitle}
          </p>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-3 shadow-sm md:p-4",
            tokens.input,
          )}
        >
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
              "w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-[#8b95a1]",
              tokens.text,
            )}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {MODES.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    active
                      ? tokens.accent
                      : cn(tokens.badge, "hover:opacity-90"),
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                  {item.label}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                className={cn(
                  "flex size-8 items-center justify-center rounded-full",
                  tokens.badge,
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
                  "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-opacity disabled:opacity-40",
                  tokens.accent,
                )}
              >
                실행
              </button>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className={cn("mb-3 text-[12px] font-semibold", tokens.textMuted)}>
            {copy.globe.agentHomeSectionRecommended}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {RECOMMENDED.map((task) => {
              const Icon = task.icon;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSubmit(task.seed, "auto")}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    tokens.card,
                    tokens.cardHover,
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                      task.accent,
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-[13px] font-semibold",
                        tokens.text,
                      )}
                    >
                      {task.title}
                    </span>
                    <span className={cn("mt-0.5 block text-[11px]", tokens.textSubtle)}>
                      {task.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className={cn("mb-3 text-[12px] font-semibold", tokens.textMuted)}>
            {copy.globe.agentHomeSectionRecent}
          </h2>
          {recent.length === 0 ? (
            <p className={cn("text-[12px]", tokens.textSubtle)}>
              {copy.globe.agentHomeSidebarEmpty}
            </p>
          ) : (
            <ul className="space-y-1">
              {recent.map((event, index) => {
                const inProgress = event.id === activeEventId || index === 0;
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(event.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        tokens.card,
                        tokens.cardHover,
                        event.id === activeEventId && tokens.accentSoft,
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          tokens.badge,
                        )}
                      >
                        <MapPin className="size-3.5" aria-hidden />
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
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-semibold",
                          inProgress ? "text-[#7b61ff]" : "text-[#03b26c]",
                        )}
                      >
                        {inProgress
                          ? copy.globe.agentHomeStatusInProgress
                          : copy.globe.agentHomeStatusCompleted}
                      </span>
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
