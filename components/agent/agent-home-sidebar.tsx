"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  ChevronRight,
  Cloud,
  History,
  Laptop,
  Moon,
  Network,
  Plus,
  Settings,
  Sparkles,
  Star,
  Store,
  Sun,
  Workflow,
} from "lucide-react";
import { RimvioLogo } from "@/components/rimvio-logo";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { copy } from "@/lib/copy/human-ko";
import {
  openAgentHomeHubLink,
  type AgentHomeHubLinkId,
} from "@/lib/agent/agent-home-ingress";
import { useAuth } from "@/hooks/use-auth";
import { usePcLocalAgent } from "@/hooks/use-pc-local-agent";
import { cn } from "@/lib/utils";

export type AgentHomeSidebarProps = {
  activeEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onNewTask: () => void;
  onOpenSettings: () => void;
  view: "dashboard" | "chat";
  className?: string;
};

function openHubNav(
  link: AgentHomeHubLinkId,
  activeEventId: string | null,
): void {
  openAgentHomeHubLink(link, { primaryEventId: activeEventId });
}

type NavItem = {
  id: AgentHomeHubLinkId | "agent" | "ontology";
  label: string;
  icon: typeof Bot;
  href?: string;
  beta?: boolean;
  onClick?: () => void;
};

export function AgentHomeSidebar({
  activeEventId,
  onSelectEvent,
  onNewTask,
  onOpenSettings,
  view,
  className,
}: AgentHomeSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { onlineDevice } = usePcLocalAgent();
  const { theme, tokens, setTheme } = useAgentHomeThemeContext();
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
      .slice(0, 6);
  }, [recentTick]);

  const displayName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Guest";

  const hubNav: NavItem[] = [
    {
      id: "agent",
      label: copy.globe.agentHomeSidebarAgent,
      icon: Bot,
      onClick: onNewTask,
    },
    {
      id: "hub",
      label: copy.globe.agentHomeSidebarHub,
      icon: Network,
      onClick: () => openHubNav("hub", activeEventId),
    },
    {
      id: "ontology",
      label: copy.globe.agentHomeSidebarOntology,
      icon: Sparkles,
      href: "/?surface=globe",
    },
    {
      id: "market",
      label: copy.globe.agentHomeSidebarMarket,
      icon: Store,
      beta: true,
      onClick: () => openHubNav("market", activeEventId),
    },
    {
      id: "automation",
      label: copy.globe.agentHomeSidebarAutomation,
      icon: Workflow,
      onClick: () => openHubNav("automation", activeEventId),
    },
  ];

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const active = item.id === "agent" && view === "dashboard";
    const body = (
      <>
        <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.beta ? (
          <span className="rounded bg-[#7b61ff]/15 px-1 py-0.5 text-[9px] font-bold text-[#7b61ff]">
            {copy.globe.agentHomeSidebarMarketBeta}
          </span>
        ) : null}
      </>
    );
    const className = cn(
      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-medium transition-colors",
      active
        ? cn(tokens.accentSoft, "font-semibold")
        : cn(tokens.textMuted, "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"),
    );
    if (item.href) {
      return (
        <Link key={item.id} href={item.href} className={className}>
          {body}
        </Link>
      );
    }
    return (
      <button key={item.id} type="button" onClick={item.onClick} className={className}>
        {body}
      </button>
    );
  };

  return (
    <aside
      className={cn(
        "hidden w-[240px] shrink-0 flex-col border-r md:flex",
        tokens.sidebar,
        tokens.sidebarBorder,
        className,
      )}
      data-agent-home-sidebar
    >
      <div className="flex items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <RimvioLogo className="h-5 w-auto" />
        <div className="min-w-0">
          <p className={cn("truncate text-[13px] font-semibold tracking-[-0.02em]", tokens.text)}>
            {copy.globe.agentHomeTitle}
          </p>
          <p className={cn("truncate text-[10px]", tokens.textSubtle)}>
            {copy.globe.agentHomeSubtitle}
          </p>
        </div>
      </div>

      <div className="px-2 pb-3">
        <button
          type="button"
          onClick={onNewTask}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left text-[12px] font-semibold shadow-sm transition-colors",
            tokens.card,
            tokens.cardHover,
            tokens.text,
          )}
        >
          <Plus className="size-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{copy.globe.agentHomeNewTask}</span>
          <span className={cn("text-[10px] font-medium", tokens.textSubtle)}>
            {copy.globe.agentHomeNewTaskShortcut}
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 rimvio-scroll-touch">
        <p className={cn("px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em]", tokens.textSubtle)}>
          {copy.globe.agentHomeSidebarTasks}
        </p>
        <div className="mb-3 space-y-0.5">
          <button
            type="button"
            onClick={() => router.push("/inbox")}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]",
              tokens.textMuted,
              "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
            )}
          >
            <History className="size-3.5" aria-hidden />
            {copy.globe.agentHomeSidebarTaskHistory}
          </button>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]",
              tokens.textMuted,
              "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
            )}
          >
            <Star className="size-3.5" aria-hidden />
            {copy.globe.agentHomeSidebarFavorites}
          </button>
        </div>

        <p className={cn("px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em]", tokens.textSubtle)}>
          {copy.globe.agentHomeSidebarAgentHub}
        </p>
        <div className="mb-3 space-y-0.5">{hubNav.map(renderNavButton)}</div>

        <p className={cn("px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em]", tokens.textSubtle)}>
          {copy.globe.agentHomeSidebarExecutionEnv}
        </p>
        <div className="space-y-1">
          <div className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]", tokens.textMuted)}>
            <Cloud className="size-3.5" aria-hidden />
            <span className="flex-1">{copy.globe.agentHomeSidebarCloud}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#03b26c]">
              <span className="size-1.5 rounded-full bg-[#03b26c]" />
              {copy.globe.agentHomeSidebarCloudOnline}
            </span>
          </div>
          <div className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]", tokens.textMuted)}>
            <Laptop className="size-3.5" aria-hidden />
            <span className="flex-1">{copy.globe.agentHomeSidebarMyPc}</span>
            <span
              className={cn(
                "text-[10px] font-semibold",
                onlineDevice ? "text-[#03b26c]" : tokens.textSubtle,
              )}
            >
              {onlineDevice
                ? copy.globe.agentHomeSidebarPcConnected
                : copy.globe.agentHomeSidebarPcOffline}
            </span>
          </div>
        </div>

        <p className={cn("mt-4 px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em]", tokens.textSubtle)}>
          {copy.globe.agentHomeSidebarRecent}
        </p>
        {recent.length === 0 ? (
          <p className={cn("px-1.5 text-[11px]", tokens.textSubtle)}>
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
                        ? cn(tokens.accent, "font-semibold")
                        : cn(tokens.textMuted, "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"),
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

      <div className={cn("border-t px-2 py-2", tokens.sidebarBorder)}>
        <div className="mb-2 flex items-center gap-1 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-semibold",
              theme === "light" ? tokens.accentSoft : tokens.textSubtle,
            )}
          >
            <Sun className="size-3" aria-hidden />
            {copy.globe.agentHomeSidebarThemeLight}
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-semibold",
              theme === "dark" ? tokens.accentSoft : tokens.textSubtle,
            )}
          >
            <Moon className="size-3" aria-hidden />
            {copy.globe.agentHomeSidebarThemeDark}
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]",
            tokens.textMuted,
            "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
          )}
        >
          <Settings className="size-3.5" aria-hidden />
          {copy.globe.agentHomeSidebarSettings}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className={cn(
            "mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left",
            "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
          )}
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-[12px] font-bold",
              tokens.accentSoft,
            )}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-[12px] font-semibold", tokens.text)}>
              {displayName}
            </span>
            <span className={cn("block text-[10px]", tokens.textSubtle)}>Pro Plan</span>
          </span>
          <ChevronRight className={cn("size-3.5", tokens.textSubtle)} aria-hidden />
        </button>
      </div>
    </aside>
  );
}
