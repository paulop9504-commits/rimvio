"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Compass,
  FolderKanban,
  History,
  Home,
  Star,
} from "lucide-react";
import { RimvioLogo } from "@/components/rimvio-logo";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type AgentHomeSidebarProps = {
  activeEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onNewTask: () => void;
  onGoHome: () => void;
  onOpenSettings: () => void;
  view: "dashboard" | "chat";
  className?: string;
};

type ConnectionRow = {
  readonly id: string;
  readonly label: string;
  readonly connected: boolean;
};

const CONNECTIONS: readonly ConnectionRow[] = [
  { id: "github", label: "GitHub", connected: true },
  { id: "vercel", label: "Vercel", connected: false },
  { id: "openai", label: "OpenAI", connected: true },
  { id: "stripe", label: "Stripe", connected: false },
];

export function AgentHomeSidebar({
  activeEventId,
  onSelectEvent,
  onGoHome,
  view,
  className,
}: AgentHomeSidebarProps) {
  const router = useRouter();
  const { tokens } = useAgentHomeThemeContext();
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

  const projects = useMemo(() => {
    void recentTick;
    return listLifeEventCandidates()
      .filter((e) => e.title?.trim())
      .slice(0, 3);
  }, [recentTick]);

  const projectCount = projects.length;

  return (
    <aside
      className={cn(
        "hidden h-full w-[200px] min-w-[200px] shrink-0 flex-col border-r md:flex",
        tokens.sidebar,
        tokens.sidebarBorder,
        className,
      )}
      data-agent-home-sidebar
    >
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <RimvioLogo size="xs" showWordmark appearance="light" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 rimvio-scroll-touch">
        <div className="space-y-px">
          <NavBtn active={view === "dashboard"} onClick={onGoHome} icon={Home} label={copy.globe.agentHomeNavHome} />
          <NavBtn
            active={false}
            onClick={() => router.push("/?surface=globe")}
            icon={Compass}
            label={copy.globe.agentHomeNavExplore}
          />
          <NavBtn
            active={false}
            onClick={() => router.push("/inbox")}
            icon={History}
            label={copy.globe.agentHomeSidebarTaskHistory}
          />
          <NavBtn active={false} onClick={() => {}} icon={Star} label={copy.globe.agentHomeSidebarFavorites} />
        </div>

        <p className={cn("mb-1 mt-4 px-1.5 text-[9px] font-bold uppercase tracking-wide", tokens.textSubtle)}>
          {copy.globe.agentHomeSidebarWorkspace}
        </p>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[10px] font-medium",
            tokens.textMuted,
            "hover:bg-[#f3f4f6]",
          )}
        >
          <FolderKanban className="size-3 shrink-0 opacity-70" aria-hidden />
          <span className="flex-1 truncate">{copy.globe.agentHomeSidebarYourProjects}</span>
          {projectCount > 0 ? (
            <span className="flex size-4 items-center justify-center rounded-full bg-[#6366f1] text-[8px] font-bold text-white">
              {projectCount}
            </span>
          ) : null}
        </button>
        {projects.length > 0 ? (
          <ul className="mt-0.5 space-y-px pl-1">
            {projects.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(event.id)}
                  className={cn(
                    "w-full truncate rounded-md px-1.5 py-1 text-left text-[9px] transition-colors",
                    event.id === activeEventId
                      ? cn(tokens.accentSoft, "font-semibold")
                      : cn(tokens.textSubtle, "hover:bg-[#f3f4f6]"),
                  )}
                >
                  {event.title}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <p className={cn("mb-1 mt-4 px-1.5 text-[9px] font-bold uppercase tracking-wide", tokens.textSubtle)}>
          {copy.globe.agentHomeSidebarConnections}
        </p>
        <ul className="space-y-px">
          {CONNECTIONS.map((conn) => (
            <li
              key={conn.id}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px]",
                tokens.textMuted,
              )}
            >
              {conn.id === "github" ? (
                <span className="flex size-3 shrink-0 items-center justify-center rounded bg-[#f3f4f6] text-[7px] font-bold">
                  GH
                </span>
              ) : (
                <span className="flex size-3 shrink-0 items-center justify-center rounded bg-[#f3f4f6] text-[7px] font-bold">
                  {conn.label.slice(0, 1)}
                </span>
              )}
              <span className="flex-1 truncate">{conn.label}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[8px] font-semibold",
                  conn.connected ? "text-[#10b981]" : tokens.textSubtle,
                )}
              >
                <span
                  className={cn(
                    "size-1 rounded-full",
                    conn.connected ? "bg-[#10b981]" : "bg-[#d1d5db]",
                  )}
                />
                {conn.connected
                  ? copy.globe.agentHomeConnectionConnected
                  : copy.globe.agentHomeConnectionNotConnected}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-2">
        <div className="rounded-xl bg-gradient-to-br from-[#ede9fe] via-[#e0e7ff] to-[#dbeafe] p-2.5">
          <p className="text-[10px] font-semibold leading-snug text-[#4338ca]">
            {copy.globe.agentHomeHubCtaTitle}
          </p>
          <Link
            href="/hub"
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#6366f1] px-2 py-1 text-[9px] font-semibold text-white hover:bg-[#4f46e5]"
          >
            {copy.globe.agentHomeHubCtaButton}
            <ArrowRight className="size-2.5" aria-hidden />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Home;
  label: string;
}) {
  const { tokens } = useAgentHomeThemeContext();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[10px] font-medium transition-colors",
        active
          ? cn(tokens.accentSoft, "font-semibold")
          : cn(tokens.textMuted, "hover:bg-[#f3f4f6]"),
      )}
    >
      <Icon className="size-3 shrink-0 opacity-80" aria-hidden />
      {label}
    </button>
  );
}
