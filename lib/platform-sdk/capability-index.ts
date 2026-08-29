/**
 * Hub Capability Index — Agent discovery SSOT (client-persisted MVP).
 * docs/RIMVIO_PLATFORM_SDK_SPEC.md §7
 */

import { buildCapabilityIndexEntry } from "@/lib/platform-sdk/manifest";
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import {
  isAgentDiscoverableCapability,
  type CapabilityIndexStatus,
  type CapabilityLifecycleStatus,
} from "@/lib/platform-sdk/capability-lifecycle";
import {
  rankCapabilityDiscovery,
  type ScoredCapabilityHit,
} from "@/lib/platform-sdk/score-capability-discovery";
import {
  schemaVersionFields,
  validateSchemaPublishTransition,
  isAgentCompatibleWithSchema,
} from "@/lib/platform-sdk/capability-schema-version";
import { clearDiscoveryCacheForTests, getCachedIndexSearch } from "@/lib/platform-sdk/discovery-cache";

export const HUB_CAPABILITY_INDEX_STORAGE_KEY = "rimvio.hub.capability-index.v1";

export type { CapabilityIndexStatus, CapabilityLifecycleStatus };

export type CapabilityIndexEntry = {
  readonly capabilityId: string;
  readonly platformId: string;
  readonly platformName: string;
  readonly marketCountry: string;
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly approvalRequired: boolean;
  readonly category: string;
  readonly tags: readonly string[];
  readonly status: CapabilityIndexStatus;
  readonly publishedAtIso: string;
  readonly routePath: string;
  readonly keywords: readonly string[];
  /** Creator who owns this capability (may differ from platform owner for attached caps). */
  readonly ownerCreatorId?: string;
  readonly origin?: "platform-bundled" | "standalone";
  readonly rimvioCertified?: boolean;
  readonly inputSchemaVersion?: number;
  readonly outputSchemaVersion?: number;
  readonly schemaFamily?: string;
};

export type CapabilityIndexPublishResult = {
  readonly registered: readonly CapabilityIndexEntry[];
  readonly rejected: readonly { readonly capabilityId: string; readonly errorKo: string }[];
};

export type CapabilitySearchHit = ScoredCapabilityHit & {
  /** @deprecated use composite */
  readonly score: number;
};

const INDEX_EVENT = "rimvio:hub-capability-index";

let memoryIndex: CapabilityIndexEntry[] | null = null;

const SEED_ENTRIES: CapabilityIndexEntry[] = [
  {
    capabilityId: "market.search",
    platformId: "platform.used-market",
    platformName: "Used Market",
    marketCountry: "KR",
    inputSchema: "market.search.v1",
    outputSchema: "market.search_result.v1",
    approvalRequired: false,
    category: "e-commerce",
    tags: ["marketplace", "resale"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/",
    keywords: ["검색", "찾", "search", "중고", "market"],
  },
  {
    capabilityId: "market.create_listing",
    platformId: "platform.used-market",
    platformName: "Used Market",
    marketCountry: "KR",
    inputSchema: "market.create_listing.v1",
    outputSchema: "market.listing.v1",
    approvalRequired: true,
    category: "e-commerce",
    tags: ["sell", "listing"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/sell",
    keywords: ["팔", "등록", "sell", "listing", "자전거", "중고", "나눔"],
  },
  {
    capabilityId: "market.make_offer",
    platformId: "platform.used-market",
    platformName: "Used Market",
    marketCountry: "KR",
    inputSchema: "market.make_offer.v1",
    outputSchema: "market.offer.v1",
    approvalRequired: true,
    category: "e-commerce",
    tags: ["offer", "price"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/product/:id",
    keywords: ["제안", "offer", "가격"],
  },
  {
    capabilityId: "market.purchase",
    platformId: "platform.used-market",
    platformName: "Used Market",
    marketCountry: "KR",
    inputSchema: "market.purchase.v1",
    outputSchema: "market.order.v1",
    approvalRequired: true,
    category: "e-commerce",
    tags: ["buy", "purchase"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/product/:id",
    keywords: ["구매", "buy", "purchase", "사"],
  },
  {
    capabilityId: "design.open",
    platformId: "platform.design-studio",
    platformName: "Design Studio",
    marketCountry: "KR",
    inputSchema: "design.open.v1",
    outputSchema: "design.model.v1",
    approvalRequired: false,
    category: "developer-tools",
    tags: ["cad", "design"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/",
    keywords: ["cad", "open", "design", "파일", "step"],
  },
  {
    capabilityId: "design.inspect",
    platformId: "platform.design-studio",
    platformName: "Design Studio",
    marketCountry: "KR",
    inputSchema: "design.inspect.v1",
    outputSchema: "design.analysis.v1",
    approvalRequired: false,
    category: "developer-tools",
    tags: ["cad", "analyze"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/analyze",
    keywords: ["분석", "analyze", "inspect", "설계", "cad"],
  },
  {
    capabilityId: "design.measure",
    platformId: "platform.design-studio",
    platformName: "Design Studio",
    marketCountry: "KR",
    inputSchema: "design.measure.v1",
    outputSchema: "design.dimensions.v1",
    approvalRequired: false,
    category: "developer-tools",
    tags: ["cad", "measure"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/measure",
    keywords: ["치수", "measure", "mm", "구멍", "dimension"],
  },
  {
    capabilityId: "design.edit",
    platformId: "platform.design-studio",
    platformName: "Design Studio",
    marketCountry: "KR",
    inputSchema: "design.edit.v1",
    outputSchema: "design.model.v1",
    approvalRequired: true,
    category: "developer-tools",
    tags: ["cad", "edit"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/edit",
    keywords: ["edit", "수정", "변경", "구멍", "hole", "mm", "design"],
  },
  {
    capabilityId: "design.export",
    platformId: "platform.design-studio",
    platformName: "Design Studio",
    marketCountry: "KR",
    inputSchema: "design.export.v1",
    outputSchema: "design.file.v1",
    approvalRequired: false,
    category: "developer-tools",
    tags: ["cad", "export"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/export",
    keywords: ["export", "step", "dwg", "pdf", "출력"],
  },
  {
    capabilityId: "design.delete",
    platformId: "platform.design-studio",
    platformName: "Design Studio",
    marketCountry: "KR",
    inputSchema: "design.delete.v1",
    outputSchema: "design.void.v1",
    approvalRequired: true,
    category: "developer-tools",
    tags: ["cad", "delete"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/delete",
    keywords: ["delete", "삭제"],
  },
];

function emitIndexChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INDEX_EVENT));
  }
}

function routeForCapability(capabilityId: string, manifest: RimvioPlatformManifest): string {
  const slug = capabilityId.split(".").pop() ?? "home";
  const match = manifest.ui.routes.find((r) =>
    r.component.toLowerCase().includes(slug.replace(/_/g, "")),
  );
  if (match) return match.path;
  if (capabilityId.includes("create") || capabilityId.includes("sell")) return "/sell";
  if (capabilityId.includes("search")) return "/";
  return manifest.ui.routes[0]?.path ?? "/";
}

function keywordsForCapability(
  capId: string,
  capName: string,
  tags: readonly string[],
): string[] {
  const parts = [
    capId,
    capName,
    ...tags,
    ...capId.split("."),
    ...capId.split("_"),
  ];
  return [...new Set(parts.map((p) => p.toLowerCase()).filter(Boolean))];
}

export function readCapabilityIndex(): readonly CapabilityIndexEntry[] {
  if (memoryIndex) return memoryIndex;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(HUB_CAPABILITY_INDEX_STORAGE_KEY);
      if (raw) {
        memoryIndex = JSON.parse(raw) as CapabilityIndexEntry[];
        return memoryIndex;
      }
    } catch {
      // fall through
    }
  }
  memoryIndex = [...SEED_ENTRIES];
  persistCapabilityIndex(memoryIndex);
  return memoryIndex;
}

export function persistCapabilityIndex(entries: CapabilityIndexEntry[]): void {
  memoryIndex = entries;
  clearDiscoveryCacheForTests();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HUB_CAPABILITY_INDEX_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }
  emitIndexChange();
}

export function registerCapabilityIndexFromManifest(
  manifest: RimvioPlatformManifest,
  status: CapabilityIndexStatus = "VALIDATING",
  meta?: {
    ownerCreatorId?: string;
    origin?: "platform-bundled" | "standalone";
    rimvioCertified?: boolean;
    capabilityFilter?: readonly string[];
  },
): CapabilityIndexEntry[] {
  return [...registerCapabilityIndexFromManifestWithValidation(manifest, status, meta).registered];
}

export function registerCapabilityIndexFromManifestWithValidation(
  manifest: RimvioPlatformManifest,
  status: CapabilityIndexStatus = "VALIDATING",
  meta?: {
    ownerCreatorId?: string;
    origin?: "platform-bundled" | "standalone";
    rimvioCertified?: boolean;
    capabilityFilter?: readonly string[];
  },
): CapabilityIndexPublishResult {
  const publishedAtIso = new Date().toISOString();
  const capFilter = meta?.capabilityFilter;
  const priorIndex = readCapabilityIndex();
  const registered: CapabilityIndexEntry[] = [];
  const rejected: Array<{ capabilityId: string; errorKo: string }> = [];

  for (const entry of buildCapabilityIndexEntry(manifest)) {
    if (capFilter?.length && !capFilter.includes(entry.capabilityId)) continue;

    const existing = priorIndex.find(
      (e) =>
        e.platformId === entry.platformId &&
        e.capabilityId === entry.capabilityId &&
        e.marketCountry === entry.marketCountry,
    );
    const validation = validateSchemaPublishTransition(existing ?? null, {
      inputSchema: entry.inputSchema,
      outputSchema: entry.outputSchema,
    });
    if (!validation.ok) {
      rejected.push({
        capabilityId: entry.capabilityId,
        errorKo: validation.errorKo ?? "스키마 검증 실패",
      });
      continue;
    }

    const cap = manifest.capabilities.find((c) => c.id === entry.capabilityId);
    const versions = schemaVersionFields(entry.inputSchema, entry.outputSchema);
    registered.push({
      ...entry,
      marketCountry: entry.marketCountry,
      status,
      publishedAtIso,
      routePath: routeForCapability(entry.capabilityId, manifest),
      keywords: keywordsForCapability(
        entry.capabilityId,
        cap?.name ?? entry.capabilityId,
        entry.tags,
      ),
      ownerCreatorId: meta?.ownerCreatorId,
      origin: meta?.origin ?? "platform-bundled",
      rimvioCertified: meta?.rimvioCertified ?? false,
      inputSchemaVersion: versions.inputSchemaVersion,
      outputSchemaVersion: versions.outputSchemaVersion,
      schemaFamily: versions.schemaFamily,
    });
  }

  const existing = priorIndex.filter((e) => e.platformId !== manifest.package.id);
  const priorPlatform = priorIndex.filter((e) => e.platformId === manifest.package.id);
  const next =
    registered.length > 0
      ? [...existing, ...registered]
      : rejected.length > 0
        ? [...existing, ...priorPlatform]
        : [...existing, ...registered];
  persistCapabilityIndex(next);
  return { registered, rejected };
}

export function searchCapabilityIndex(
  utterance: string,
  opts?: { limit?: number; publishedOnly?: boolean; marketCountry?: string },
): CapabilitySearchHit[] {
  const text = utterance.trim();
  if (!text) return [];

  const limit = opts?.limit ?? 5;
  const publishedOnly = opts?.publishedOnly ?? true;
  const marketCountry = opts?.marketCountry?.toUpperCase();
  const index = readCapabilityIndex().filter((e) => {
    if (publishedOnly && !isAgentDiscoverableCapability(e.status)) return false;
    if (marketCountry && e.marketCountry !== marketCountry) return false;
    if (!isAgentCompatibleWithSchema(e.inputSchema)) return false;
    return true;
  });

  const { hits } = getCachedIndexSearch(text, marketCountry, limit, () =>
    rankCapabilityDiscovery({
      utterance: text,
      entries: index,
      marketCountry,
      limit,
    }).map((hit) => ({
      ...hit,
      score: hit.composite,
    })),
  );
  return hits;
}

export function subscribeCapabilityIndex(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => listener();
  window.addEventListener(INDEX_EVENT, handler);
  return () => window.removeEventListener(INDEX_EVENT, handler);
}

export function clearCapabilityIndexForTests(): void {
  memoryIndex = null;
  clearDiscoveryCacheForTests();
  if (typeof window !== "undefined") {
    localStorage.removeItem(HUB_CAPABILITY_INDEX_STORAGE_KEY);
  }
}
