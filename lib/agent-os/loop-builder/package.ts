/**
 * Loop + Capabilities packaged like an Agent Capability Package.
 */

import { lintLoopDefinition } from "@/lib/agent-os/loop-builder/lint";
import type { AgentCapabilityPackage, LoopDefinition } from "@/lib/agent-os/loop-builder/types";

export function packageLoopAsCapability(input: {
  readonly name: string;
  readonly loop: LoopDefinition;
  readonly capabilities?: readonly string[];
  readonly tested?: boolean;
}): AgentCapabilityPackage {
  const caps = [
    ...new Set([
      ...(input.capabilities ?? []),
      ...input.loop.nodes
        .map((n) => n.config.capabilityId ?? n.config.toolId)
        .filter((x): x is string => Boolean(x)),
    ]),
  ];
  const lint = lintLoopDefinition(input.loop);
  return {
    name: input.name,
    version: input.loop.version,
    capabilities: caps,
    loop: input.loop,
    policies: input.loop.nodes.some((n) => n.kind === "APPROVAL") ? ["approval_required"] : [],
    verification: input.loop.nodes.filter((n) => n.kind === "VERIFY").map((n) => n.label),
    dependencies: input.loop.nodes.flatMap((n) => (n.config.capabilityId ? [n.config.capabilityId] : [])),
    tested: input.tested ?? false,
    verified: lint.ok,
  };
}
