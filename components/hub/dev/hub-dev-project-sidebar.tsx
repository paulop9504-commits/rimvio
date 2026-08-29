"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DEV_WORKSPACE_BUILD_PANES,
  DEV_WORKSPACE_SHIP_PANES,
  type DevWorkspacePane,
} from "@/lib/hub/dev/dev-workspace-nav";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";

type HubDevProjectSidebarProps = {
  readonly platformName: string;
  readonly activePane: DevWorkspacePane;
  readonly snapshot: DevProjectSnapshot;
  readonly onPaneChange: (pane: DevWorkspacePane) => void;
  readonly onOpenAde: () => void;
};

function PaneButton({
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: string | number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
        active
          ? "bg-[#4593fc]/15 text-[#8ec0ff]"
          : "text-[#9aa3af] hover:bg-white/[0.04] hover:text-[#e2e8f0]",
      )}
    >
      <span className="w-5 shrink-0 text-center text-[11px]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge !== undefined && badge !== 0 && badge !== "0/0" ? (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 text-[10px]",
            label === "Issues" && Number(String(badge).split("/")[0]) > 0
              ? "bg-red-500/20 text-red-400"
              : "bg-white/[0.06] text-[#6b7684]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function HubDevProjectSidebar({
  platformName,
  activePane,
  snapshot,
  onPaneChange,
  onOpenAde,
}: HubDevProjectSidebarProps) {
  const badgeFor = (id: DevWorkspacePane): string | number | undefined => {
    switch (id) {
      case "sources":
        return snapshot.sources.length || undefined;
      case "issues":
        return snapshot.issuesCount || undefined;
      case "changes":
        return snapshot.changesCount || undefined;
      case "capabilities":
        return snapshot.capabilityCount || undefined;
      case "tests":
        return snapshot.testsTotal
          ? `${snapshot.testsPassed}/${snapshot.testsTotal}`
          : undefined;
      case "status":
        return snapshot.status.agentReady ? "Ready" : undefined;
      default:
        return undefined;
    }
  };

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0e1014]">
      <div className="border-b border-white/[0.06] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
          Platform Builder
        </p>
        <button
          type="button"
          onClick={onOpenAde}
          className={cn(
            "mt-1 block w-full truncate text-left text-[13px] font-semibold",
            activePane === "ade" ? "text-[#8ec0ff]" : "text-[#f2f4f6] hover:text-[#8ec0ff]",
          )}
        >
          {platformName || "New Platform"}
        </button>
        <Link
          href="/hub"
          className="mt-2 block text-[10px] text-[#6b7684] hover:text-[#8ec0ff]"
        >
          ← All Platforms
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 rimvio-scroll-touch">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#4b5563]">
          Build
        </p>
        <div className="space-y-0.5">
          {DEV_WORKSPACE_BUILD_PANES.map((item) => (
            <PaneButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={activePane === item.id}
              badge={badgeFor(item.id)}
              onClick={() => onPaneChange(item.id)}
            />
          ))}
        </div>

        <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#4b5563]">
          Ship
        </p>
        <div className="space-y-0.5">
          {DEV_WORKSPACE_SHIP_PANES.map((item) => (
            <PaneButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={activePane === item.id}
              onClick={() => onPaneChange(item.id)}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/[0.06] p-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
          Status
        </p>
        <StatusStep
          label="Agent Ready"
          active={snapshot.status.agentReady}
          done={snapshot.status.agentReady}
        />
        <StatusStep
          label={
            snapshot.status.certifiedVersion
              ? `Certified ${snapshot.status.certifiedVersion}`
              : "Certified"
          }
          active={snapshot.status.rimvioCertified}
          done={snapshot.status.rimvioCertified}
        />
        <StatusStep
          label={
            snapshot.status.published
              ? `Published ${snapshot.status.publishedAgoKo ?? ""}`.trim()
              : "Published"
          }
          active={snapshot.status.published}
          done={snapshot.status.published}
        />
      </div>
    </aside>
  );
}

function StatusStep({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-medium",
        done ? "text-emerald-400" : active ? "text-[#8ec0ff]" : "text-[#4b5563]",
      )}
    >
      <span>{done ? "✓" : "○"}</span>
      <span className="truncate">{label}</span>
    </p>
  );
}
