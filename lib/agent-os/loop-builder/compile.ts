/**
 * Compile Loop Definition → existing runtime steps (Hub tools).
 * Does not spawn a new Agent Runtime.
 */

import { HUB_WORKSPACE_TOOL_IDS, type HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import type { LoopDefinition, LoopNode } from "@/lib/agent-os/loop-builder/types";

const TOOL_SET = new Set<string>(HUB_WORKSPACE_TOOL_IDS);

export type CompiledLoopStep = {
  readonly nodeId: string;
  readonly label: string;
  readonly toolId: HubWorkspaceToolId | null;
  readonly kind: LoopNode["kind"];
  readonly args: Record<string, unknown>;
};

function toolForNode(node: LoopNode): HubWorkspaceToolId | null {
  const raw = node.config.toolId ?? node.config.capabilityId ?? "";
  if (raw && TOOL_SET.has(raw)) return raw as HubWorkspaceToolId;
  switch (node.kind) {
    case "INSPECT":
    case "STATE":
      return "workspace.inspect";
    case "VERIFY":
    case "OBSERVE":
      return node.config.target === "payment" || node.kind === "VERIFY" ? "test.run" : "workspace.inspect";
    case "ACT":
    case "CAPABILITY":
      return raw && TOOL_SET.has(raw) ? (raw as HubWorkspaceToolId) : "capability.create";
    case "TOOL":
      return raw && TOOL_SET.has(raw) ? (raw as HubWorkspaceToolId) : "workspace.read";
    case "DATABASE":
      return "resource.apply";
    case "BROWSER":
      return "test.e2e";
    case "APPROVAL":
      return "publish.request";
    case "CUSTOM":
      return node.config.toolId && TOOL_SET.has(node.config.toolId)
        ? (node.config.toolId as HubWorkspaceToolId)
        : "resource.apply";
    default:
      return null;
  }
}

export function compileLoopToRuntimeSteps(loop: LoopDefinition): readonly CompiledLoopStep[] {
  const byId = new Map(loop.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, typeof loop.edges>();
  for (const e of loop.edges) {
    const list = outgoing.get(e.from) ?? [];
    outgoing.set(e.from, [...list, e]);
  }

  const ordered: LoopNode[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    const node = byId.get(id);
    if (!node) return;
    seen.add(id);
    ordered.push(node);
    for (const e of outgoing.get(id) ?? []) {
      if (e.kind === "next" || e.kind === "yes" || e.kind === "pass") walk(e.to);
    }
    for (const e of outgoing.get(id) ?? []) {
      if (e.kind === "no" || e.kind === "fail") walk(e.to);
    }
  };
  walk(loop.entryId);
  for (const n of loop.nodes) {
    if (!seen.has(n.id)) walk(n.id);
  }

  return ordered.map((node) => ({
    nodeId: node.id,
    label: node.label,
    toolId: toolForNode(node),
    kind: node.kind,
    args: {
      target: node.config.target,
      capability: node.config.capabilityId,
      utterance: node.label,
      customCode: node.config.customCode,
      templateId: node.config.templateId,
      inputMap: node.config.inputMap,
      outputVars: node.config.outputVars,
      checks: node.config.checks,
      predicate: node.config.predicate,
    },
  }));
}
