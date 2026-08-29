"use client";

import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  CreditCard,
  Cpu,
  Database,
  FileDiff,
  FlaskConical,
  GitBranch,
  Layers,
  Link2,
  Package,
  Puzzle,
  Rocket,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEV_SIDEBAR_BUILD_NAV,
  DEV_SIDEBAR_SHIP_NAV,
  DEV_SIDEBAR_VALIDATE_NAV,
  type DevWorkspacePane,
} from "@/lib/hub/dev/dev-workspace-nav";
import { buildDevBlueprintModel } from "@/lib/hub/dev/dev-blueprint-model";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  link: Link2,
  puzzle: Puzzle,
  database: Database,
  "git-branch": GitBranch,
  shield: Shield,
  layers: Layers,
  cpu: Cpu,
  "credit-card": CreditCard,
  alert: AlertCircle,
  "file-diff": FileDiff,
  flask: FlaskConical,
  rocket: Rocket,
  package: Package,
};

type HubDevProjectSidebarProps = {
  readonly platformName: string;
  readonly draft: PlatformDraft;
  readonly activePane: DevWorkspacePane;
  readonly snapshot: DevProjectSnapshot;
  readonly onPaneChange: (pane: DevWorkspacePane) => void;
  readonly onOpenAde: () => void;
};

export function HubDevProjectSidebar({
  platformName,
  draft,
  activePane,
  snapshot,
  onPaneChange,
  onOpenAde,
}: HubDevProjectSidebarProps) {
  const blueprint = buildDevBlueprintModel({ draft, snapshot });

  const badges: Record<string, string | number | undefined> = {
    sources: snapshot.sources.length || undefined,
    capabilities: snapshot.capabilityCount || undefined,
    data: blueprint.dataEntities.length,
    workflows: blueprint.workflows.length,
    permissions: blueprint.permissions.length,
    context: blueprint.contextFields.length,
    runtime: blueprint.runtimes.length,
    commerce: 1,
    issues: snapshot.issuesCount || undefined,
    changes: snapshot.changesCount || undefined,
    tests: snapshot.testsTotal ? `${snapshot.testsPassed}/${snapshot.testsTotal}` : undefined,
  };

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-[#e5e7eb] bg-white">
      <div className="border-b border-[#f3f4f6] p-4">
        <button type="button" onClick={onOpenAde} className="w-full text-left">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-bold text-[#111827]">{platformName || "New Platform"}</p>
            {snapshot.status.agentReady ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                Agent Ready
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#9ca3af]">
            {draft.description || "Platform Builder workspace"}
          </p>
        </button>
        <Link href="/hub" className="mt-3 flex items-center gap-1 text-[11px] text-[#9ca3af] hover:text-violet-600">
          <ChevronLeft className="size-3" />
          All Platforms
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 rimvio-scroll-touch">
        <NavSection title="Build" items={DEV_SIDEBAR_BUILD_NAV} activePane={activePane} badges={badges} onPaneChange={onPaneChange} className="" />
        <NavSection title="Validate" items={DEV_SIDEBAR_VALIDATE_NAV} activePane={activePane} badges={badges} onPaneChange={onPaneChange} className="mt-4" />
        <NavSection title="Ship" items={DEV_SIDEBAR_SHIP_NAV} activePane={activePane} badges={badges} onPaneChange={onPaneChange} className="mt-4" />
      </nav>

      <div className="border-t border-[#f3f4f6] p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">Status</p>
        <div className="mt-2 space-y-1.5">
          <StatusRow done={snapshot.status.agentReady} label="Agent Ready" />
          <StatusRow done={snapshot.status.rimvioCertified} label={snapshot.status.certifiedVersion ? `Certified ${snapshot.status.certifiedVersion}` : "Certified"} />
          <StatusRow done={snapshot.status.published} label={snapshot.status.published ? `Published ${snapshot.status.publishedAgoKo ?? ""}`.trim() : "Published"} />
        </div>
        <Link href="#" className="mt-4 block text-[11px] text-[#9ca3af] hover:text-violet-600">
          Rimvio Docs
        </Link>
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  activePane,
  badges,
  onPaneChange,
  className,
}: {
  title: string;
  items: typeof DEV_SIDEBAR_BUILD_NAV;
  activePane: DevWorkspacePane;
  badges: Record<string, string | number | undefined>;
  onPaneChange: (pane: DevWorkspacePane) => void;
  className?: string;
}) {
  const paneIsActive = (id: DevWorkspacePane) => activePane === id;
  return (
    <div className={className}>
      <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? Puzzle;
          const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
          const active = paneIsActive(item.id);
          const warn = item.id === "issues" && Number(badge) > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPaneChange(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] font-medium transition-colors",
                active ? "bg-violet-50 text-violet-700" : "text-[#4b5563] hover:bg-[#f9fafb]",
              )}
            >
              <Icon className={cn("size-4 shrink-0", warn ? "text-red-500" : active ? "text-violet-600" : "text-[#9ca3af]")} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badge !== undefined && badge !== 0 && badge !== "0/0" ? (
                <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", warn ? "bg-red-50 text-red-600" : "bg-[#f3f4f6] text-[#6b7280]")}>
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-[11px] font-medium", done ? "text-emerald-600" : "text-[#9ca3af]")}>
      <span className={cn("flex size-4 items-center justify-center rounded-full text-[9px]", done ? "bg-emerald-100" : "bg-[#f3f4f6]")}>
        {done ? "✓" : "○"}
      </span>
      <span className="truncate">{label}</span>
    </p>
  );
}
