"use client";

import { cn } from "@/lib/utils";
import type { DevWorkspacePane } from "@/lib/hub/dev/dev-workspace-nav";

const CREATOR_TABS: readonly {
  readonly id: DevWorkspacePane;
  readonly label: string;
  readonly agentTab?: boolean;
}[] = [
  { id: "ade", label: "Dashboard" },
  { id: "capabilities", label: "Capability" },
  { id: "loops", label: "Loop" },
  { id: "ade", label: "Agent", agentTab: true },
  { id: "deploy", label: "Marketplace" },
];

type HubDevCreatorNavProps = {
  readonly activePane: DevWorkspacePane;
  readonly onPaneChange: (pane: DevWorkspacePane) => void;
  readonly onOpenAgent?: () => void;
};

export function HubDevCreatorNav(props: HubDevCreatorNavProps) {
  return (
    <nav className="flex shrink-0 items-center gap-1 border-b border-[#e5e7eb] bg-white px-4">
      {CREATOR_TABS.map((tab) => {
        const active = tab.agentTab
          ? props.activePane === "ade"
          : props.activePane === tab.id;
        return (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              if (tab.agentTab) {
                props.onOpenAgent?.();
                props.onPaneChange("ade");
                return;
              }
              props.onPaneChange(tab.id);
            }}
            className={cn(
              "border-b-2 px-3 py-2 text-[11px] font-semibold transition-colors",
              active
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-[#6b7280] hover:text-[#111827]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
