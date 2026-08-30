"use client";

import { useCallback, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { AGENT_HOME_ACTION_PILLS } from "@/lib/agent/agent-home-services";
import { copy } from "@/lib/copy/human-ko";
import type { AgentHomeModeId } from "@/lib/agent/agent-home-tokens";
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
  const [draft, setDraft] = useState(initialDraft);

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
      <div className="relative mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center justify-center px-4 pb-16 pt-8 md:px-5">
        <p className={cn("text-[13px] font-semibold tracking-[-0.02em]", tokens.textMuted)}>
          {copy.brand.name}
        </p>
        <h1
          className={cn(
            "mt-8 text-center text-[28px] font-semibold tracking-[-0.04em] md:text-[34px]",
            tokens.text,
          )}
        >
          {copy.globe.agentHomeGreeting}
        </h1>
        <p className={cn("mt-2 text-center text-[15px] leading-relaxed md:text-[16px]", tokens.textMuted)}>
          {copy.globe.agentHomeHeroTagline}
        </p>

        <div className="mt-10 w-full rounded-[28px] border border-black/[0.08] bg-white px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={copy.globe.agentHomeComposerPlaceholderAlt}
              className={cn(
                "min-h-[28px] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-[#9ca3af]",
                tokens.text,
              )}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!draft.trim()}
              className={cn(
                "mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30",
                tokens.accent,
              )}
              aria-label={copy.globe.agentHomeExecute}
            >
              <ArrowUp className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {AGENT_HOME_ACTION_PILLS.map((pill) => {
            const Icon = pill.icon;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onSubmit(pill.seed, "auto")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[#f7f7f7]",
                  tokens.textMuted,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
