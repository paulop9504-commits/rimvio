/**
 * Platform Builder — sidebar navigation (mockup-aligned).
 */

export type DevWorkspacePane =
  | "ade"
  | "sources"
  | "capabilities"
  | "data"
  | "workflows"
  | "permissions"
  | "context"
  | "runtime"
  | "commerce"
  | "issues"
  | "changes"
  | "tests"
  | "status"
  | "deploy"
  | "versions";

export type DevSidebarNavItem = {
  readonly id: DevWorkspacePane;
  readonly label: string;
  readonly icon: string;
  readonly section: "build" | "validate" | "ship";
  readonly badgeKey?: keyof DevSidebarBadgeKeys;
};

export type DevSidebarBadgeKeys = {
  sources: number;
  capabilities: number;
  data: number;
  workflows: number;
  permissions: number;
  context: number;
  runtime: number;
  commerce: number;
  issues: number;
  changes: number;
  tests: string;
};

export const DEV_SIDEBAR_BUILD_NAV: readonly DevSidebarNavItem[] = [
  { id: "sources", label: "Sources", icon: "link", section: "build", badgeKey: "sources" },
  { id: "capabilities", label: "Capabilities", icon: "puzzle", section: "build", badgeKey: "capabilities" },
  { id: "data", label: "Data", icon: "database", section: "build", badgeKey: "data" },
  { id: "workflows", label: "Workflows", icon: "git-branch", section: "build", badgeKey: "workflows" },
  { id: "permissions", label: "Permissions", icon: "shield", section: "build", badgeKey: "permissions" },
  { id: "context", label: "Context", icon: "layers", section: "build", badgeKey: "context" },
  { id: "runtime", label: "Runtime", icon: "cpu", section: "build", badgeKey: "runtime" },
  { id: "commerce", label: "Commerce", icon: "credit-card", section: "build", badgeKey: "commerce" },
];

export const DEV_SIDEBAR_VALIDATE_NAV: readonly DevSidebarNavItem[] = [
  { id: "issues", label: "Issues", icon: "alert", section: "validate", badgeKey: "issues" },
  { id: "changes", label: "Changes", icon: "file-diff", section: "validate", badgeKey: "changes" },
  { id: "tests", label: "Tests", icon: "flask", section: "validate", badgeKey: "tests" },
];

export const DEV_SIDEBAR_SHIP_NAV: readonly DevSidebarNavItem[] = [
  { id: "deploy", label: "Deploy", icon: "rocket", section: "ship" },
  { id: "versions", label: "Versions", icon: "package", section: "ship" },
];

/** @deprecated use DEV_SIDEBAR_BUILD_NAV */
export const DEV_WORKSPACE_BUILD_PANES = DEV_SIDEBAR_BUILD_NAV;
export const DEV_WORKSPACE_SHIP_PANES = DEV_SIDEBAR_SHIP_NAV;

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
    data: "data",
    workflows: "workflows",
    permissions: "permissions",
    context: "context",
    runtime: "runtime",
    commerce: "commerce",
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

/** Blueprint-only panes scroll/highlight on ADE dashboard */
export function isBlueprintSectionPane(pane: DevWorkspacePane): boolean {
  return ["data", "workflows", "permissions", "context", "runtime", "commerce"].includes(pane);
}
