/**
 * Publish → Registry — server SSOT + client index sync.
 */

import { buildCapabilityIndexEntry } from "@/lib/platform-sdk/manifest";
import {
  type CapabilityIndexEntry,
} from "@/lib/platform-sdk/capability-index";
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import { AGENT_PLATFORM_CATALOG, getCatalogCapability } from "../capability-catalog";
import type { PublishCapabilityInput, PublishCapabilityResult } from "../types";
import {
  findServerRegistryEntry,
  readServerRegistry,
  upsertServerRegistryEntry,
  writeServerRegistry,
} from "../persistence/durable-store";
import { ensureAgentPlatformHydrated } from "../persistence/hydrate";

function catalogToIndexEntry(
  capabilityId: string,
  platformId?: string,
): CapabilityIndexEntry | null {
  const def = getCatalogCapability(capabilityId);
  if (!def) return null;
  const now = new Date().toISOString();
  return {
    capabilityId: def.capabilityId,
    platformId: platformId ?? def.platformId,
    platformName: def.platformName,
    marketCountry: "KR",
    inputSchema: def.inputSchema,
    outputSchema: def.outputSchema,
    approvalRequired: def.approvalRequired,
    category: def.category,
    tags: def.tags,
    status: "PUBLISHED",
    publishedAtIso: now,
    routePath: def.routePath,
    keywords: def.keywords,
    origin: "standalone",
  };
}

export async function ensureRegistryReady(): Promise<void> {
  await ensureAgentPlatformHydrated();
  if (readServerRegistry().length === 0) {
    seedServerRegistryFromCatalog();
  }
}

export function seedServerRegistryFromCatalog(): CapabilityIndexEntry[] {
  const existing = new Set(readServerRegistry().map((row) => row.capabilityId));
  const seeded: CapabilityIndexEntry[] = [];
  for (const def of readServerRegistry()) {
    seeded.push(def);
  }
  for (const def of AGENT_PLATFORM_CATALOG) {
    if (existing.has(def.capabilityId)) continue;
    const entry = catalogToIndexEntry(def.capabilityId);
    if (entry) seeded.push(entry);
  }
  return writeServerRegistry(seeded);
}

export function publishCapabilityToRegistry(
  input: PublishCapabilityInput,
): PublishCapabilityResult {
  const entry = input.entry;
  if (!entry.capabilityId?.trim()) {
    return { ok: false, errorKo: "capabilityId가 필요해요.", indexSize: readServerRegistry().length };
  }
  upsertServerRegistryEntry({
    ...entry,
    status: entry.status ?? "PUBLISHED",
    publishedAtIso: entry.publishedAtIso ?? new Date().toISOString(),
  });
  return { ok: true, entry, indexSize: readServerRegistry().length };
}

export function publishFromManifest(manifest: RimvioPlatformManifest): PublishCapabilityResult[] {
  const entries = buildCapabilityIndexEntry(manifest);
  return entries.map((entry) => publishCapabilityToRegistry({ entry }));
}

export function publishCatalogCapability(
  capabilityId: string,
  platformId?: string,
): PublishCapabilityResult {
  const entry = catalogToIndexEntry(capabilityId, platformId);
  if (!entry) {
    return { ok: false, errorKo: "카탈로그에 없는 capability예요.", indexSize: readServerRegistry().length };
  }
  return publishCapabilityToRegistry({ entry });
}

export function resolveRegistryEntry(capabilityId: string): CapabilityIndexEntry | null {
  return findServerRegistryEntry(capabilityId) ?? catalogToIndexEntry(capabilityId);
}

export function listRegistryEntries(): readonly CapabilityIndexEntry[] {
  if (readServerRegistry().length === 0) {
    seedServerRegistryFromCatalog();
  }
  return readServerRegistry();
}

export function searchRegistry(query: string): CapabilityIndexEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...listRegistryEntries()];
  return listRegistryEntries().filter((entry) => {
    const hay = [
      entry.capabilityId,
      entry.platformName,
      entry.category,
      ...entry.tags,
      ...entry.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
