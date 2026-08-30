"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelLeft, Plus, Settings } from "lucide-react";
import { RimvioLogo } from "@/components/rimvio-logo";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import Link from "next/link";
import { copy } from "@/lib/copy/human-ko";
import { writeExperienceRole } from "@/lib/experience-app";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type AgentHomeSidebarProps = {
  activeEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onNewTask: () => void;
  onGoHome: () => void;
  onOpenSettings: () => void;
  view: "dashboard" | "chat";
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function AgentHomeSidebar({
  activeEventId,
  onSelectEvent,
  onNewTask,
  onGoHome,
  onOpenSettings,
  view,
  className,
  mobileOpen = false,
  onMobileClose,
}: AgentHomeSidebarProps) {
  const { tokens, theme } = useAgentHomeThemeContext();
  const { user } = useAuth();
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

  const conversations = useMemo(() => {
    void recentTick;
    return listLifeEventCandidates()
      .filter((e) => e.title?.trim())
      .slice(0, 40);
  }, [recentTick]);

  const displayName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    copy.brand.name;

  const rail = (
    <aside
      className={cn(
        "flex h-full w-[260px] min-w-[260px] shrink-0 flex-col",
        tokens.sidebar,
        className,
      )}
      data-agent-home-sidebar
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => {
            onGoHome();
            onMobileClose?.();
          }}
          className="min-w-0"
          aria-label={copy.brand.name}
        >
          <RimvioLogo
            size="xs"
            showWordmark
            appearance={theme === "dark" ? "white" : "light"}
          />
        </button>
        <button
          type="button"
          onClick={onMobileClose}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg md:hidden",
            tokens.textMuted,
            "hover:bg-black/[0.05]",
          )}
          aria-label={copy.globe.agentHomeCloseSidebar}
        >
          <PanelLeft className="size-4" aria-hidden />
        </button>
      </div>

      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={() => {
            onNewTask();
            onMobileClose?.();
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium",
            view === "dashboard" ? tokens.accentSoft : tokens.text,
            "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
          )}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          {copy.globe.agentHomeNewTask}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 rimvio-scroll-touch">
        <p className={cn("mb-1 px-2.5 pt-1 text-[11px] font-medium", tokens.textSubtle)}>
          {copy.experienceApp.mySpace}
        </p>
        <Link
          href="/experience?role=consumer"
          onClick={() => {
            writeExperienceRole("consumer");
            onMobileClose?.();
          }}
          className={cn(
            "mb-2 flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px]",
            tokens.textMuted,
            "hover:bg-black/[0.05]",
          )}
        >
          <span>{copy.experienceApp.order}</span>
          <span className={cn("text-[10px]", tokens.textSubtle)}>{copy.experienceApp.roleConsumer}</span>
        </Link>
        <p className={cn("mb-1 px-2.5 pt-2 text-[11px] font-medium", tokens.textSubtle)}>
          {copy.experienceApp.myServices}
        </p>
        <Link
          href="/experience?role=merchant"
          onClick={() => {
            writeExperienceRole("merchant");
            onMobileClose?.();
          }}
          className={cn(
            "mb-1 flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px]",
            tokens.textMuted,
            "hover:bg-black/[0.05]",
          )}
        >
          <span>동네 배달</span>
          <span className={cn("text-[10px]", tokens.textSubtle)}>{copy.experienceApp.roleMerchant}</span>
        </Link>
        <Link
          href="/hub/create"
          onClick={onMobileClose}
          className={cn(
            "mb-3 flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px]",
            tokens.textMuted,
            "hover:bg-black/[0.05]",
          )}
        >
          <span>{copy.experienceApp.createService}</span>
        </Link>
        <p className={cn("mb-1 px-2.5 pt-1 text-[11px] font-medium", tokens.textSubtle)}>
          {copy.globe.agentHomeSidebarRecent}
        </p>
        {conversations.length === 0 ? (
          <p className={cn("px-2.5 py-2 text-[12px] leading-relaxed", tokens.textSubtle)}>
            {copy.globe.agentHomeSidebarEmpty}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectEvent(event.id);
                    onMobileClose?.();
                  }}
                  className={cn(
                    "w-full truncate rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    event.id === activeEventId
                      ? cn(tokens.accentSoft, "font-medium")
                      : cn(tokens.textMuted, "hover:bg-black/[0.05]"),
                  )}
                >
                  {event.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-black/[0.06] p-2">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onMobileClose?.();
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-black/[0.05]",
          )}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
              tokens.accentSoft,
            )}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className={cn("min-w-0 flex-1 truncate text-[13px]", tokens.text)}>
            {displayName}
          </span>
          <Settings className={cn("size-4 shrink-0", tokens.textSubtle)} aria-hidden />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden h-full md:flex">{rail}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden" data-agent-home-sidebar-drawer>
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label={copy.globe.agentHomeCloseSidebar}
            onClick={onMobileClose}
          />
          <div className="relative h-full w-[min(86vw,280px)] shadow-xl">{rail}</div>
        </div>
      ) : null}
    </>
  );
}
