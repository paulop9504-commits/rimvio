/**
 * P3 — Hub Tool Catalog with risk + approval metadata.
 */

import type { HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";

export type ToolRiskLevel = "low" | "medium" | "high";

export type HubToolCatalogEntry = {
  readonly id: HubWorkspaceToolId | "publish.request" | "connection.verify";
  readonly category: "workspace" | "file" | "capability" | "schema" | "workflow" | "connection" | "test" | "deploy";
  readonly label: string;
  readonly risk: ToolRiskLevel;
  readonly requiresApproval: boolean;
  readonly mutatesWorkspace: boolean;
};

export const HUB_TOOL_CATALOG: readonly HubToolCatalogEntry[] = [
  { id: "workspace.read", category: "workspace", label: "Read workspace", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "workspace.inspect", category: "workspace", label: "Inspect workspace", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "workspace.search", category: "workspace", label: "Search workspace", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "file.read", category: "file", label: "Read file", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "file.patch", category: "file", label: "Patch file", risk: "low", requiresApproval: false, mutatesWorkspace: true },
  { id: "code.listFiles", category: "file", label: "List source files", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "code.searchFiles", category: "file", label: "Search source files", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "code.readFile", category: "file", label: "Read source file", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "code.modifyFile", category: "file", label: "Modify source file", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "code.searchSymbol", category: "file", label: "Search symbol", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "code.findReferences", category: "file", label: "Find references", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "code.createFile", category: "file", label: "Create source file", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "code.deleteFile", category: "file", label: "Delete source file", risk: "high", requiresApproval: true, mutatesWorkspace: true },
  { id: "code.transform", category: "file", label: "Transform source", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "code.findDefinition", category: "file", label: "Find definition", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "code.analyzeImports", category: "file", label: "Analyze imports", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "code.callGraph", category: "file", label: "Call graph", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "repo.clone", category: "workspace", label: "Clone repository", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "repo.status", category: "workspace", label: "Repo status", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "test.discover", category: "test", label: "Discover tests", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "test.generate", category: "test", label: "Generate test", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "test.e2e", category: "test", label: "Run E2E", risk: "medium", requiresApproval: false, mutatesWorkspace: false },
  { id: "lint.run", category: "test", label: "Lint", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "typecheck.run", category: "test", label: "Type check", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "server.start", category: "test", label: "Start dev server", risk: "medium", requiresApproval: false, mutatesWorkspace: false },
  { id: "server.stop", category: "test", label: "Stop dev server", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "server.status", category: "test", label: "Dev server status", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "resource.apply", category: "workspace", label: "Apply experience resource", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "verification.run", category: "test", label: "Verification engine", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "terminal.run", category: "test", label: "Run terminal command", risk: "medium", requiresApproval: false, mutatesWorkspace: false },
  { id: "build.run", category: "test", label: "Run build", risk: "medium", requiresApproval: false, mutatesWorkspace: false },
  { id: "file.write", category: "file", label: "Write file", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "capability.list", category: "capability", label: "List capabilities", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "capability.create", category: "capability", label: "Create capability", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "capability.update", category: "capability", label: "Update capability", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "capability.delete", category: "capability", label: "Delete capability", risk: "high", requiresApproval: true, mutatesWorkspace: true },
  { id: "schema.read", category: "schema", label: "Read schema", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "schema.update", category: "schema", label: "Update schema", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "workflow.read", category: "workflow", label: "Read workflow", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "workflow.create", category: "workflow", label: "Create workflow", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "workflow.update", category: "workflow", label: "Update workflow", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "permission.read", category: "capability", label: "Read permissions", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "permission.update", category: "capability", label: "Update permissions", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "connection.list", category: "connection", label: "List connections", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "connection.connect", category: "connection", label: "Connect provider", risk: "medium", requiresApproval: false, mutatesWorkspace: false },
  { id: "connection.verify", category: "connection", label: "Verify connection", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "test.run", category: "test", label: "Run sandbox tests", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "preview.run", category: "test", label: "Preview platform", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "deploy.prepare", category: "deploy", label: "Prepare deploy", risk: "medium", requiresApproval: false, mutatesWorkspace: false },
  { id: "platform.sync", category: "workspace", label: "Sync platform ↔ source", risk: "medium", requiresApproval: false, mutatesWorkspace: true },
  { id: "loop.create", category: "workflow", label: "Create agent loop", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "loop.test", category: "test", label: "Test agent loop", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "loop.read", category: "workflow", label: "Read agent loop", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "loop.lint", category: "test", label: "Lint agent loop", risk: "low", requiresApproval: false, mutatesWorkspace: false },
  { id: "publish.request", category: "deploy", label: "Request publish", risk: "high", requiresApproval: true, mutatesWorkspace: true },
] as const;

export function getHubToolCatalogEntry(toolId: string): HubToolCatalogEntry | null {
  const entry = HUB_TOOL_CATALOG.find((e) => e.id === toolId);
  return entry ?? null;
}

export function listHubToolsByCategory(
  category: HubToolCatalogEntry["category"],
): readonly HubToolCatalogEntry[] {
  return HUB_TOOL_CATALOG.filter((e) => e.category === category);
}
