/**
 * Loop Builder → Agent Platform Registry publish bridge.
 */

import type { AgentCapabilityPackage, LoopDefinition } from "@/lib/agent-os/loop-builder/types";
import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";
import { publishCapabilityToRegistry } from "./publish";

function loopCapabilityId(platformId: string, loop: LoopDefinition): string {
  const slug = loop.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `loop.${platformId}.${slug || loop.id}`.slice(0, 80);
}

function packageToIndexEntry(input: {
  readonly platformId: string;
  readonly platformName: string;
  readonly pkg: AgentCapabilityPackage;
  readonly loop: LoopDefinition;
}): CapabilityIndexEntry {
  const capabilityId = loopCapabilityId(input.platformId, input.loop);
  const now = new Date().toISOString();
  return {
    capabilityId,
    platformId: input.platformId,
    platformName: input.platformName,
    marketCountry: "KR",
    inputSchema: `${capabilityId}.v1`,
    outputSchema: `${capabilityId}_result.v1`,
    approvalRequired: input.pkg.policies.includes("approval_required"),
    category: "loop",
    tags: ["loop", "orchestration", ...input.pkg.capabilities.slice(0, 5)],
    status: "PUBLISHED",
    publishedAtIso: now,
    routePath: "/hub/create",
    keywords: [input.loop.name, "loop", ...input.pkg.capabilities],
    origin: "standalone",
  };
}

export function publishLoopPackageToRegistry(input: {
  readonly platformId: string;
  readonly platformName?: string;
  readonly pkg: AgentCapabilityPackage;
  readonly loop: LoopDefinition;
}): { readonly ok: boolean; readonly capabilityId: string; readonly indexSize: number; readonly errorKo?: string } {
  const entry = packageToIndexEntry({
    platformId: input.platformId,
    platformName: input.platformName ?? input.platformId,
    pkg: input.pkg,
    loop: input.loop,
  });

  for (const capId of input.pkg.capabilities) {
    publishCapabilityToRegistry({
      entry: {
        capabilityId: capId,
        platformId: input.platformId,
        platformName: input.platformName ?? input.platformId,
        marketCountry: "KR",
        inputSchema: `${capId}.v1`,
        outputSchema: `${capId}_result.v1`,
        approvalRequired: false,
        category: "loop-member",
        tags: ["loop-member"],
        status: "PUBLISHED",
        publishedAtIso: new Date().toISOString(),
        routePath: "/hub/create",
        keywords: [capId, input.loop.name],
        origin: "standalone",
      },
    });
  }

  const result = publishCapabilityToRegistry({ entry });
  return {
    ok: result.ok,
    capabilityId: entry.capabilityId,
    indexSize: result.indexSize,
    errorKo: result.errorKo,
  };
}

export { loopCapabilityId };
