/**
 * Platform Builder — sidebar panes (status board, not IDE menus).
 * Center = ADE ingress · Side = Sources → Caps → Issues → Changes → Tests → Status
 */

export type DevWorkspacePane =
  | "ade"
  | "sources"
  | "capabilities"
  | "issues"
  | "changes"
  | "tests"
  | "status"
  | "deploy"
  | "versions";

export type DevWorkspacePaneItem = {
  readonly id: DevWorkspacePane;
  readonly label: string;
  readonly icon: string;
  readonly section: "build" | "ship";
};

/** Cursor-like feel — Platform Builder state queue (not settings). */
export const DEV_WORKSPACE_BUILD_PANES: readonly DevWorkspacePaneItem[] = [
  { id: "sources", label: "Sources", icon: "📎", section: "build" },
  { id: "capabilities", label: "Capabilities", icon: "🧩", section: "build" },
  { id: "issues", label: "Issues", icon: "⚠", section: "build" },
  { id: "changes", label: "Changes", icon: "🔄", section: "build" },
  { id: "tests", label: "Tests", icon: "🧪", section: "build" },
  { id: "status", label: "Status", icon: "✓", section: "build" },
];

export const DEV_WORKSPACE_SHIP_PANES: readonly DevWorkspacePaneItem[] = [
  { id: "deploy", label: "Deploy", icon: "🚀", section: "ship" },
  { id: "versions", label: "Versions", icon: "📦", section: "ship" },
];

export function parseDevWorkspacePane(
  paneParam: string | null,
  navParam: string | null,
): DevWorkspacePane {
  const raw = paneParam ?? navParam;
  const map: Record<string, DevWorkspacePane> = {
    ade: "ade",
    workspace: "ade",
    overview: "ade",
    "ai-build": "ade",
    sources: "sources",
    files: "sources",
    capabilities: "capabilities",
    configuration: "capabilities",
    issues: "issues",
    changes: "changes",
    tests: "tests",
    status: "status",
    deployments: "deploy",
    deploy: "deploy",
    versions: "versions",
  };
  if (raw && raw in map) return map[raw]!;
  return "ade";
}
