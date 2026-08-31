/**
 * MVP workspace local capability drafts (UI state only).
 * Publish path → lib/capability-core/registry.ts → capability-index SSOT.
 */

import {
  publishStandaloneCapabilityEntry,
  readCapabilityIndex,
  type CapabilityIndexEntry,
} from "@/lib/capability-core";
import type { MvpCapability, MvpLoop } from "@/lib/hub/dev/mvp/types";

const CAPABILITIES_KEY = "rimvio.hub.mvp.capabilities.v1";
const LOOPS_KEY = "rimvio.hub.mvp.loops.v1";

const DEFAULT_CAPABILITIES: MvpCapability[] = [
  {
    id: "product.search",
    name: "Product Search",
    description: "웹사이트에서 상품을 검색합니다",
    inputSchema: [{ name: "query", type: "string" }],
    outputSchema: [{ name: "products", type: "array" }],
    status: "published",
    version: "1.0.0",
    creator: "rimvio",
    runtime: "browser",
    createdAt: new Date().toISOString(),
  },
  {
    id: "product.compare",
    name: "Price Comparison",
    description: "상품 가격을 비교합니다",
    inputSchema: [{ name: "products", type: "array" }],
    outputSchema: [{ name: "best", type: "object" }],
    status: "published",
    version: "1.0.0",
    creator: "rimvio",
    runtime: "browser",
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_LOOPS: MvpLoop[] = [
  {
    id: "product-compare-loop",
    name: "상품 검색 · 비교",
    capabilityIds: ["product.search", "product.compare"],
  },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function readMvpCapabilities(): MvpCapability[] {
  const stored = readJson<MvpCapability[] | null>(CAPABILITIES_KEY, null);
  return stored ?? DEFAULT_CAPABILITIES;
}

export function saveMvpCapability(cap: MvpCapability): MvpCapability[] {
  const list = readMvpCapabilities();
  const idx = list.findIndex((row) => row.id === cap.id);
  const next = idx >= 0 ? list.map((row, i) => (i === idx ? cap : row)) : [...list, cap];
  writeJson(CAPABILITIES_KEY, next);
  return next;
}

export function readMvpLoops(): MvpLoop[] {
  const stored = readJson<MvpLoop[] | null>(LOOPS_KEY, null);
  return stored ?? DEFAULT_LOOPS;
}

function keywordsFor(cap: MvpCapability): string[] {
  const base = [cap.name, cap.description, cap.id];
  if (cap.id.includes("search")) return [...base, "검색", "찾", "search", "상품"];
  if (cap.id.includes("compare")) return [...base, "비교", "가격", "compare", "price"];
  return base;
}

export function publishMvpCapability(cap: MvpCapability): MvpCapability {
  const published: MvpCapability = { ...cap, status: "published" };
  saveMvpCapability(published);

  const entry: CapabilityIndexEntry = {
    capabilityId: cap.id,
    platformId: "platform.dev-hub",
    platformName: "Rimvio Dev Hub",
    marketCountry: "KR",
    inputSchema: `${cap.id}.input.v1`,
    outputSchema: `${cap.id}.output.v1`,
    approvalRequired: false,
    category: "automation",
    tags: ["dev-hub", "mvp"],
    status: "PUBLISHED",
    publishedAtIso: new Date().toISOString(),
    routePath: "/",
    keywords: keywordsFor(cap),
    origin: "standalone",
  };

  publishStandaloneCapabilityEntry(entry);
  return published;
}

export function readMvpPublishedFromIndex(): CapabilityIndexEntry[] {
  return readCapabilityIndex().filter((row) => row.platformId === "platform.dev-hub");
}
