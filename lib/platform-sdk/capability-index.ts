/**
 * Hub Capability Index — Agent discovery SSOT (client-persisted MVP).
 * docs/RIMVIO_PLATFORM_SDK_SPEC.md §7
 */

import { buildCapabilityIndexEntry } from "@/lib/platform-sdk/manifest";
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";

export const HUB_CAPABILITY_INDEX_STORAGE_KEY = "rimvio.hub.capability-index.v1";

export type CapabilityIndexStatus = "pending-review" | "published";

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
};

export type CapabilitySearchHit = CapabilityIndexEntry & {
  readonly score: number;
  readonly matchReason: string;
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
    status: "published",
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
    status: "published",
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
    status: "published",
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
    status: "published",
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
  status: CapabilityIndexStatus = "pending-review",
): CapabilityIndexEntry[] {
  const publishedAtIso = new Date().toISOString();
  const built = buildCapabilityIndexEntry(manifest).map((entry) => {
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
  const text = utterance.trim().toLowerCase();
  if (!text) return [];

  const limit = opts?.limit ?? 5;
  const publishedOnly = opts?.publishedOnly ?? true;
  const marketCountry = opts?.marketCountry?.toUpperCase();
  const index = readCapabilityIndex().filter((e) => {
    if (publishedOnly && e.status !== "published") return false;
    if (marketCountry && e.marketCountry !== marketCountry) return false;
    return true;
  });

  const scored: CapabilitySearchHit[] = [];

  for (const entry of index) {
    let score = 0;
    let matchReason = "";

    if (text.includes(entry.capabilityId.toLowerCase())) {
      score += 1;
      matchReason = "capability id";
    }

    for (const kw of entry.keywords) {
      if (kw.length < 2) continue;
      if (text.includes(kw)) {
        score += kw.length >= 4 ? 0.35 : 0.2;
        matchReason = matchReason || `keyword:${kw}`;
      }
    }

    if (text.includes(entry.platformName.toLowerCase())) {
      score += 0.25;
      matchReason = matchReason || "platform name";
    }

    for (const tag of entry.tags) {
      if (text.includes(tag.toLowerCase())) {
        score += 0.15;
        matchReason = matchReason || `tag:${tag}`;
      }
    }

    // Intent patterns
    if (/팔|등록|sell|listing/.test(text) && entry.capabilityId.includes("create_listing")) {
      score += 0.5;
      matchReason = "sell intent";
    }
    if (/찾|검색|search|살|구매|buy/.test(text) && entry.capabilityId.includes("search")) {
      score += 0.4;
      matchReason = matchReason || "search/buy intent";
    }
    if (/자전거|bike|책|book|맥북|mac/.test(text) && entry.category === "e-commerce") {
      score += 0.2;
      matchReason = matchReason || "product noun";
    }

    if (score > 0.15) {
      scored.push({ ...entry, score, matchReason });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
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
