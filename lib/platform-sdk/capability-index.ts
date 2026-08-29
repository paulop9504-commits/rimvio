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
  const publishedAtIso = new Date().toISOString();
  const capFilter = meta?.capabilityFilter;
  const built = buildCapabilityIndexEntry(manifest)
    .filter((entry) => !capFilter?.length || capFilter.includes(entry.capabilityId))
    .map((entry) => {
    const cap = manifest.capabilities.find((c) => c.id === entry.capabilityId);
    return {
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
    } satisfies CapabilityIndexEntry;
  });

  const existing = [...readCapabilityIndex()].filter(
    (e) => e.platformId !== manifest.package.id,
  );
  const next = [...existing, ...built];
  persistCapabilityIndex(next);
  return built;
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
    return true;
  });

  return rankCapabilityDiscovery({
    utterance: text,
    entries: index,
    marketCountry,
    limit,
  }).map((hit) => ({
    ...hit,
    score: hit.composite,
  }));
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
  if (typeof window !== "undefined") {
    localStorage.removeItem(HUB_CAPABILITY_INDEX_STORAGE_KEY);
  }
}
