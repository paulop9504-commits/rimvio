"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { RimvioLogo } from "@/components/rimvio-logo";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type AgentHomeSidebarProps = {
  activeEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onNewTask: () => void;
  className?: string;
};

export function AgentHomeSidebar({
  activeEventId,
  onSelectEvent,
  onNewTask,
  className,
}: AgentHomeSidebarProps) {
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

  const recent = useMemo(() => {
    void recentTick;
    return listLifeEventCandidates()
      .filter((e) => e.title?.trim())
      .slice(0, 8);
  }, [recentTick]);

  return (
    <aside
      className={cn(
        "hidden w-[220px] shrink-0 flex-col border-r border-black/[0.06] bg-[#eceef1] md:flex",
        className,
      )}
      data-agent-home-sidebar
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <RimvioLogo className="h-5 w-auto" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[#191f28]">
            {copy.globe.agentHomeTitle}
          </p>
          <p className="truncate text-[10px] text-[#8b95a1]">
            {copy.globe.agentHomeSubtitle}
          </p>
        </div>
      </div>

      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={onNewTask}
          className="flex w-full items-center gap-2 rounded-lg border border-black/[0.06] bg-white px-2.5 py-2 text-left text-[12px] font-semibold text-[#191f28] shadow-sm transition-colors hover:bg-[#fafbfc]"
        >
          <Plus className="size-3.5 shrink-0 text-[#4e5968]" aria-hidden />
          {copy.globe.agentHomeNewTask}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 rimvio-scroll-touch">
        <p className="px-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8b95a1]">
          {copy.globe.agentHomeSidebarRecent}
        </p>
        {recent.length === 0 ? (
          <p className="px-1.5 text-[11px] leading-relaxed text-[#8b95a1]">
            {copy.globe.agentHomeSidebarEmpty}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {recent.map((event) => {
              const active = event.id === activeEventId;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(event.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-[12px] leading-snug transition-colors",
                      active
                        ? "bg-[#191f28] font-semibold text-white"
                        : "text-[#333d4b] hover:bg-black/[0.05]",
                    )}
                  >
                    <span className="line-clamp-2">{event.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-black/[0.06] px-2 py-2">
        <Link
          href="/?surface=globe"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium text-[#4e5968] hover:bg-black/[0.04]"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {copy.globe.agentHomeGlobeLink}
        </Link>
      </div>
    </aside>
  );
}
