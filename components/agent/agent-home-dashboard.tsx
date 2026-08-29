"use client";

import { useCallback, useState } from "react";
import { ArrowUp, Mic, Sparkles } from "lucide-react";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import {
  AGENT_HOME_ACTION_PILLS,
  AGENT_HOME_RECOMMENDED_SERVICES,
} from "@/lib/agent/agent-home-services";
import { copy } from "@/lib/copy/human-ko";
import type { AgentHomeModeId } from "@/lib/agent/agent-home-tokens";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type AgentHomeDashboardProps = {
  onSubmit: (text: string, mode: AgentHomeModeId) => void;
  onSelectEvent: (eventId: string) => void;
  activeEventId: string | null;
  onOpenSettings?: () => void;
  initialDraft?: string;
};

export function AgentHomeDashboard({ onSubmit, initialDraft = "" }: AgentHomeDashboardProps) {
  const { tokens } = useAgentHomeThemeContext();
  const { user } = useAuth();
  const [draft, setDraft] = useState(initialDraft);

  const displayName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Guest";

  const handleSubmit = useCallback(() => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    onSubmit(text, "auto");
    setDraft("");
  }, [draft, onSubmit]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto rimvio-scroll-touch">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.14),transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-[680px] flex-1 flex-col px-4 pb-6 pt-5 md:px-5 md:pt-7">
        <div className="text-center">
          <h1 className={cn("text-[18px] font-bold tracking-[-0.02em] md:text-[20px]", tokens.text)}>
            {copy.globe.agentHomeGreetingUser(displayName)}
          </h1>
          <p className={cn("mt-1 text-[12px] leading-relaxed md:text-[13px]", tokens.textMuted)}>
            {copy.globe.agentHomeHeroTagline}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-3 py-2 shadow-[0_4px_24px_rgba(99,102,241,0.08)]">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#6366f1]">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={copy.globe.agentHomeComposerPlaceholderAlt}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9ca3af]",
              tokens.text,
            )}
          />
          <button
            type="button"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#f3f4f6]"
            aria-label="Voice"
          >
            <Mic className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!draft.trim()}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40",
              tokens.accent,
            )}
            aria-label={copy.globe.agentHomeExecute}
          >
            <ArrowUp className="size-3.5" aria-hidden />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {AGENT_HOME_ACTION_PILLS.map((pill) => {
            const Icon = pill.icon;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onSubmit(pill.seed, "auto")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-white/80 px-2.5 py-1 text-[10px] font-medium backdrop-blur-sm transition-colors hover:border-[#d1d5db] hover:bg-white",
                  tokens.textMuted,
                )}
              >
                <Icon className="size-3" aria-hidden />
                {pill.label}
              </button>
            );
          })}
        </div>

        <section className="mt-8">
          <h2 className={cn("mb-3 text-[12px] font-semibold", tokens.text)}>
            {copy.globe.agentHomeSectionRecommendedServices}
          </h2>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {AGENT_HOME_RECOMMENDED_SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => onSubmit(service.seed, "auto")}
                  className={cn(
                    "group overflow-hidden rounded-xl border text-left transition-all",
                    tokens.card,
                    tokens.cardHover,
                  )}
                >
                  <div className={cn("relative h-[72px] bg-gradient-to-br", service.thumbClass)}>
                    <span
                      className={cn(
                        "absolute left-2 top-2 flex size-6 items-center justify-center rounded-md shadow-sm",
                        service.iconClass,
                      )}
                    >
                      <Icon className="size-3" aria-hidden />
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-1 p-2">
                    <div className="min-w-0">
                      <p className={cn("truncate text-[11px] font-semibold", tokens.text)}>
                        {service.title}
                      </p>
                      <p className={cn("truncate text-[9px]", tokens.textSubtle)}>{service.category}</p>
                    </div>
                    <span className={cn("pb-0.5 text-[10px] opacity-40 group-hover:opacity-70", tokens.textSubtle)}>
                      →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
