/**
 * Dev Hub workspace command bus — Agent tools and UI share one event channel.
 * Browser-only; no-ops on the server.
 */

import type { DevWorkspacePane } from "@/lib/hub/dev/dev-workspace-nav";
import type { LoopDefinition, LoopTestResult } from "@/lib/agent-os/loop-builder";

export type HubOperatorTab = "chat" | "changes" | "terminal" | "activity";

export type HubWorkspaceCommand =
  | { readonly kind: "open_pane"; readonly pane: DevWorkspacePane }
  | { readonly kind: "open_preview" }
  | { readonly kind: "close_preview" }
  | { readonly kind: "open_operator_tab"; readonly tab: HubOperatorTab }
  | { readonly kind: "focus_capability"; readonly capabilityId: string }
  | { readonly kind: "test_invoke"; readonly capabilityId: string }
  | { readonly kind: "loop_updated"; readonly platformId: string; readonly loop: LoopDefinition }
  | { readonly kind: "loop_test_result"; readonly platformId: string; readonly test: LoopTestResult };

export const HUB_WORKSPACE_COMMAND_EVENT = "rimvio:hub-workspace-command";

export function dispatchHubWorkspaceCommand(command: HubWorkspaceCommand): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HUB_WORKSPACE_COMMAND_EVENT, { detail: command }));
}

export function subscribeHubWorkspaceCommand(
  listener: (command: HubWorkspaceCommand) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<HubWorkspaceCommand>;
    if (custom.detail) listener(custom.detail);
  };
  window.addEventListener(HUB_WORKSPACE_COMMAND_EVENT, handler);
  return () => window.removeEventListener(HUB_WORKSPACE_COMMAND_EVENT, handler);
}

export function paneForBlueprintCard(title: string): DevWorkspacePane {
  const map: Record<string, DevWorkspacePane> = {
    Capabilities: "capabilities",
    Loops: "loops",
    Data: "data",
    Workflows: "workflows",
    Permissions: "permissions",
    Context: "context",
    Runtime: "runtime",
    Commerce: "commerce",
    "Platform Health": "status",
  };
  return map[title] ?? "ade";
}

export function paneForActivityId(id: string): DevWorkspacePane {
  if (id === "a2") return "issues";
  if (id === "a3") return "tests";
  if (id === "a4") return "status";
  return "ade";
}
