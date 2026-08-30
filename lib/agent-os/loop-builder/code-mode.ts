/**
 * Visual ↔ Code 1:1. Same Loop Definition.
 */

import { createLoopNode } from "@/lib/agent-os/loop-builder/nodes";
import type { LoopDefinition, LoopEdge, LoopNode, LoopNodeKind } from "@/lib/agent-os/loop-builder/types";

const KIND_METHOD: Record<string, LoopNodeKind> = {
  trigger: "TRIGGER",
  understand: "UNDERSTAND",
  inspect: "INSPECT",
  decide: "DECIDE",
  act: "ACT",
  observe: "OBSERVE",
  verify: "VERIFY",
  condition: "CONDITION",
  if: "CONDITION",
  replan: "REPLAN",
  retry: "RETRY",
  wait: "WAIT",
  ask: "ASK_USER",
  ask_user: "ASK_USER",
  approval: "APPROVAL",
  complete: "COMPLETE",
  fail: "FAIL",
  capability: "CAPABILITY",
  tool: "TOOL",
  custom: "CUSTOM",
  code: "CUSTOM",
};

export function loopDefinitionToCode(loop: LoopDefinition): string {
  const lines = [`loop("${loop.name.replace(/"/g, "")}")`];
  for (const node of loop.nodes) {
    if (node.kind === "CUSTOM" && node.config.customCode?.trim()) {
      const escaped = node.config.customCode.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
      lines.push(`  .custom(\`${escaped}\`)`);
      continue;
    }
    const method = Object.entries(KIND_METHOD).find(([, k]) => k === node.kind)?.[0] ?? node.kind.toLowerCase();
    const arg = node.config.target ?? node.config.capabilityId ?? node.config.toolId ?? node.label;
    const retry = node.kind === "RETRY" && node.config.maxAttempts
      ? `, ${node.config.maxAttempts}`
      : "";
    lines.push(`  .${method}("${arg}"${retry})`);
  }
  return lines.join("\n");
}

export function parseLoopCode(source: string): LoopDefinition {
  const nameMatch = source.match(/loop\s*\(\s*["']([^"']+)["']\s*\)/);
  const name = nameMatch?.[1] ?? "Untitled Loop";
  const callRe = /\.([a-z_]+)\s*\(\s*(?:["']([^"']*)["'])?\s*(?:,\s*(\d+))?\s*\)/gi;
  const nodes: LoopNode[] = [];
  const edges: LoopEdge[] = [];
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = callRe.exec(source))) {
    const method = match[1]!.toLowerCase();
    if (method === "custom" || method === "code") {
      const codeMatch = source.slice(match.index).match(/\.(?:custom|code)\(\s*`([\s\S]*?)`\s*\)/i);
      const customCode = codeMatch?.[1]?.replace(/\\`/g, "`").replace(/\\\\/g, "\\") ?? "";
      const id = `n_${i}_custom`;
      nodes.push(
        createLoopNode("CUSTOM", id, "Custom Block", {
          customCode,
        }),
      );
      if (i > 0) edges.push({ from: nodes[i - 1]!.id, to: id, kind: "next" });
      i += 1;
      continue;
    }
    const kind = KIND_METHOD[method];
    if (!kind) continue;
    const arg = match[2] ?? "";
    const max = match[3] ? Number(match[3]) : undefined;
    const id = `n_${i}_${kind.toLowerCase()}`;
    nodes.push(
      createLoopNode(kind, id, arg || undefined, {
        target: arg || undefined,
        maxAttempts: kind === "RETRY" ? max ?? 2 : max,
        capabilityId: kind === "CAPABILITY" ? arg : undefined,
        toolId: kind === "TOOL" || kind === "ACT" ? arg : undefined,
      }),
    );
    if (i > 0) {
      edges.push({ from: nodes[i - 1]!.id, to: id, kind: "next" });
    }
    i += 1;
  }
  return {
    id: `loop-code-${Date.now()}`,
    name,
    version: "1.0.0",
    description: "from code",
    source: "code",
    nodes,
    edges,
    entryId: nodes[0]?.id ?? "n_0",
  };
}

export function roundTripCode(loop: LoopDefinition): boolean {
  const parsed = parseLoopCode(loopDefinitionToCode(loop));
  return parsed.nodes.length === loop.nodes.length && parsed.nodes.every((n, i) => n.kind === loop.nodes[i]?.kind);
}
