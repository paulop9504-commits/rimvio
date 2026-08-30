/**
 * Platform Builder — sidebar navigation (mockup-aligned).
 */

export type DevWorkspacePane =
  | "ade"
  | "sources"
  | "capabilities"
  | "data"
  | "storage"
  | "users"
  | "functions"
  | "automations"
  | "loops"
  | "workflows"
  | "permissions"
  | "context"
  | "runtime"
  | "commerce"
  | "secrets"
  | "issues"
  | "changes"
  | "tests"
  | "verification"
  | "standards"
  | "status"
  | "deploy"
  | "domains"
  | "logs"
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
  storage: number;
  users: number;
  functions: number;
  automations: number;
  loops: number;
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
  { id: "storage", label: "Storage", icon: "hard-drive", section: "build", badgeKey: "storage" },
  { id: "users", label: "Users", icon: "users", section: "build", badgeKey: "users" },
  { id: "functions", label: "Functions", icon: "zap", section: "build", badgeKey: "functions" },
  { id: "automations", label: "Automations", icon: "clock", section: "build", badgeKey: "automations" },
  { id: "loops", label: "Loops", icon: "repeat", section: "build", badgeKey: "loops" },
  { id: "workflows", label: "Workflows", icon: "git-branch", section: "build", badgeKey: "workflows" },
  { id: "permissions", label: "Permissions", icon: "shield", section: "build", badgeKey: "permissions" },
  { id: "context", label: "Context", icon: "layers", section: "build", badgeKey: "context" },
  { id: "runtime", label: "Runtime", icon: "cpu", section: "build", badgeKey: "runtime" },
  { id: "commerce", label: "Commerce", icon: "credit-card", section: "build", badgeKey: "commerce" },
];

export const DEV_SIDEBAR_VALIDATE_NAV: readonly DevSidebarNavItem[] = [
  { id: "standards", label: "Standards", icon: "book", section: "validate" },
  { id: "issues", label: "Issues", icon: "alert", section: "validate", badgeKey: "issues" },
  { id: "changes", label: "Changes", icon: "file-diff", section: "validate", badgeKey: "changes" },
  { id: "tests", label: "Tests", icon: "flask", section: "validate", badgeKey: "tests" },
  { id: "verification", label: "Verify", icon: "check-circle", section: "validate" },
];

export const DEV_SIDEBAR_SHIP_NAV: readonly DevSidebarNavItem[] = [
  { id: "deploy", label: "Deploy", icon: "rocket", section: "ship" },
  { id: "domains", label: "Domains", icon: "globe", section: "ship" },
  { id: "secrets", label: "Secrets", icon: "key", section: "ship" },
  { id: "logs", label: "Logs", icon: "scroll", section: "ship" },
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
    storage: "storage",
    users: "users",
    functions: "functions",
    automations: "automations",
    loops: "loops",
    loop: "loops",
    workflows: "workflows",
    permissions: "permissions",
    context: "context",
    runtime: "runtime",
    commerce: "commerce",
    configuration: "capabilities",
    issues: "issues",
    changes: "changes",
    tests: "tests",
    verification: "verification",
    verify: "verification",
    standards: "standards",
    status: "status",
    deployments: "deploy",
    deploy: "deploy",
    domains: "domains",
    secrets: "secrets",
    logs: "logs",
    versions: "versions",
  };
  if (raw && raw in map) return map[raw]!;
  return "ade";
}

/** Blueprint-only panes scroll/highlight on ADE dashboard */
export function isBlueprintSectionPane(pane: DevWorkspacePane): boolean {
  return ["data", "workflows", "permissions", "context", "runtime", "commerce"].includes(pane);
}
