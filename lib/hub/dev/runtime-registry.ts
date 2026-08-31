/**
 * Hub Runtime Store — extension runtimes register beside Rimvio Core (ADR-062).
 */

import { RIMVIO_CORE_RUNTIME_STANDARD } from "@/lib/hub/dev/hub-registry-stores";

export const HUB_RUNTIME_INDEX_STORAGE_KEY = "rimvio.hub.runtime-index.v2";

export type RuntimeIndexStatus = "pending-review" | "published" | "certified";

export type RuntimeTier = "core" | "extension";

export type RuntimeType = "pc" | "browser" | "industrial" | "cloud" | "mobile";

export type RuntimeSupport = "camera" | "plc" | "sensor" | "database" | "network";

export type RuntimeInterface = "context" | "event" | "tool" | "permission";

export type RuntimeCostTier = "low" | "medium" | "high";

export type RuntimeOperationalProfile = {
  readonly healthScore: number;
  readonly latencyMsP50: number;
  readonly costTier: RuntimeCostTier;
  readonly executionEndpoint?: string;
  readonly healthEndpoint?: string;
};

export type RuntimeIndexEntry = {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly tier: RuntimeTier;
  readonly type: RuntimeType;
  readonly ownerCreatorId: string;
  readonly supports: readonly RuntimeSupport[];
  readonly interfaces: readonly RuntimeInterface[];
  readonly status: RuntimeIndexStatus;
  readonly rimvioStandardVersion: string;
  readonly securityPolicy: "rimvio-enforced";
  readonly publishedAtIso: string;
  readonly description?: string;
  readonly operational: RuntimeOperationalProfile;
  readonly compatibleInfrastructureIds?: readonly string[];
};

export type RimvioRuntimeManifest = {
  readonly name: string;
  readonly version: string;
  readonly tier: RuntimeTier;
  readonly type: RuntimeType;
  readonly supports: readonly RuntimeSupport[];
  readonly interfaces: readonly RuntimeInterface[];
  readonly ownerCreatorId: string;
  readonly entry: string;
  readonly rimvioStandardVersion: string;
};

const INDEX_EVENT = "rimvio:hub-runtime-index";

let memoryIndex: RuntimeIndexEntry[] | null = null;

const CORE_OWNER = "Rimvio";

const SEED_RUNTIMES: RuntimeIndexEntry[] = [
  {
    id: "rimvio.pc-runtime",
    name: "Rimvio PC Runtime",
    version: "1.0.0",
    tier: "core",
    type: "pc",
    ownerCreatorId: CORE_OWNER,
    supports: ["database", "network"],
    interfaces: ["context", "event", "tool", "permission"],
    status: "certified",
    rimvioStandardVersion: RIMVIO_CORE_RUNTIME_STANDARD.version,
    securityPolicy: "rimvio-enforced",
    publishedAtIso: new Date().toISOString(),
    description: "Core desktop agent runtime",
    operational: { healthScore: 0.992, latencyMsP50: 380, costTier: "medium" },
  },
  {
    id: "rimvio.browser-runtime",
    name: "Rimvio Browser Runtime",
    version: "1.0.0",
    tier: "core",
    type: "browser",
    ownerCreatorId: CORE_OWNER,
    supports: ["network"],
    interfaces: ["context", "event", "tool", "permission"],
    status: "certified",
    rimvioStandardVersion: RIMVIO_CORE_RUNTIME_STANDARD.version,
    securityPolicy: "rimvio-enforced",
    publishedAtIso: new Date().toISOString(),
    description: "Core browser sandbox runtime",
    operational: {
      healthScore: 0.999,
      latencyMsP50: 320,
      costTier: "low",
      executionEndpoint: "rimvio://runtime/browser/execute",
      healthEndpoint: "rimvio://runtime/browser/health",
    },
  },
  {
    id: "browser.runtime.partner",
    name: "Browser Runtime B",
    version: "1.2.0",
    tier: "extension",
    type: "browser",
    ownerCreatorId: "Partner Cloud",
    supports: ["network"],
    interfaces: ["context", "tool", "permission"],
    status: "published",
    rimvioStandardVersion: RIMVIO_CORE_RUNTIME_STANDARD.version,
    securityPolicy: "rimvio-enforced",
    publishedAtIso: new Date().toISOString(),
    description: "Partner-hosted browser sandbox",
    operational: { healthScore: 0.982, latencyMsP50: 700, costTier: "medium" },
  },
  {
    id: "rimvio.cloud-runtime",
    name: "Rimvio Cloud Runtime",
    version: "1.0.0",
    tier: "core",
    type: "cloud",
    ownerCreatorId: CORE_OWNER,
    supports: ["database", "network"],
    interfaces: ["context", "event", "tool", "permission"],
    status: "certified",
    rimvioStandardVersion: RIMVIO_CORE_RUNTIME_STANDARD.version,
    securityPolicy: "rimvio-enforced",
    publishedAtIso: new Date().toISOString(),
    description: "Core cloud agent runtime",
    operational: { healthScore: 0.995, latencyMsP50: 450, costTier: "low" },
  },
  {
    id: "rimvio.vision-runtime",
    name: "Vision Runtime",
    version: "1.4.0",
    tier: "extension",
    type: "industrial",
    ownerCreatorId: "Rimvio Labs",
    supports: ["camera", "sensor", "network"],
    interfaces: ["context", "tool", "permission"],
    status: "certified",
    rimvioStandardVersion: RIMVIO_CORE_RUNTIME_STANDARD.version,
    securityPolicy: "rimvio-enforced",
    publishedAtIso: new Date().toISOString(),
    description: "Industrial vision · extension runtime",
    operational: { healthScore: 0.978, latencyMsP50: 210, costTier: "medium" },
    compatibleInfrastructureIds: ["factory.plc.default"],
  },
  {
    id: "factory.runtime",
    name: "Factory Runtime",
    version: "2.1.0",
    tier: "extension",
    type: "industrial",
    ownerCreatorId: "Factory Dev Co",
    supports: ["camera", "plc", "sensor", "database", "network"],
    interfaces: ["context", "event", "tool", "permission"],
    status: "certified",
    rimvioStandardVersion: RIMVIO_CORE_RUNTIME_STANDARD.version,
    securityPolicy: "rimvio-enforced",
    publishedAtIso: new Date().toISOString(),
    description: "Factory floor · extension runtime",
    operational: { healthScore: 0.971, latencyMsP50: 180, costTier: "high" },
    compatibleInfrastructureIds: ["factory.plc.default"],
  },
];

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INDEX_EVENT));
  }
}

function normalizeRuntimeEntry(
  entry: RuntimeIndexEntry & { operational?: RuntimeOperationalProfile },
): RuntimeIndexEntry {
  return {
    ...entry,
    operational: entry.operational ?? {
      healthScore: 0.95,
      latencyMsP50: 500,
      costTier: "medium",
    },
  };
}

export function readRuntimeIndex(): readonly RuntimeIndexEntry[] {
  if (memoryIndex) return memoryIndex;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(HUB_RUNTIME_INDEX_STORAGE_KEY);
      if (raw) {
        memoryIndex = (JSON.parse(raw) as RuntimeIndexEntry[]).map(normalizeRuntimeEntry);
        return memoryIndex;
      }
    } catch {
      // fall through
    }
  }
  memoryIndex = [...SEED_RUNTIMES];
  persistRuntimeIndex(memoryIndex);
  return memoryIndex;
}

export function persistRuntimeIndex(entries: RuntimeIndexEntry[]): void {
  memoryIndex = entries;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HUB_RUNTIME_INDEX_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }
  emitChange();
}

export function subscribeRuntimeIndex(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(INDEX_EVENT, handler);
  return () => window.removeEventListener(INDEX_EVENT, handler);
}

export function slugifyRuntimeId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
}

export function registerRuntimeFromManifest(
  manifest: RimvioRuntimeManifest,
  status: RuntimeIndexStatus = "pending-review",
): RuntimeIndexEntry {
  const entry: RuntimeIndexEntry = {
    id: slugifyRuntimeId(manifest.name),
    name: manifest.name,
    version: manifest.version,
    tier: manifest.tier,
    type: manifest.type,
    ownerCreatorId: manifest.ownerCreatorId,
    supports: [...manifest.supports],
    interfaces: [...manifest.interfaces],
    status,
    rimvioStandardVersion: manifest.rimvioStandardVersion,
    securityPolicy: "rimvio-enforced",
    publishedAtIso: new Date().toISOString(),
    operational: {
      healthScore: 0.95,
      latencyMsP50: 500,
      costTier: "medium",
    },
  };

  const existing = [...readRuntimeIndex()].filter((e) => e.id !== entry.id);
  persistRuntimeIndex([...existing, entry]);
  return entry;
}

export function listPublishedRuntimes(): readonly RuntimeIndexEntry[] {
  return readRuntimeIndex().filter(
    (e) => e.status === "published" || e.status === "certified",
  );
}

export function defaultRimvioRuntimeManifest(input: {
  name: string;
  ownerCreatorId: string;
  type: RuntimeType;
}): RimvioRuntimeManifest {
  return {
    name: input.name,
    version: "0.1.0",
    tier: "extension",
    type: input.type,
    supports: ["network"],
    interfaces: ["context", "event", "tool", "permission"],
    ownerCreatorId: input.ownerCreatorId,
    entry: "runtime/index.ts",
    rimvioStandardVersion: RIMVIO_CORE_RUNTIME_STANDARD.version,
  };
}
