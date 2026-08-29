/**
 * Hub Infrastructure Store (ADR-062 MVP).
 */

export const HUB_INFRASTRUCTURE_INDEX_STORAGE_KEY = "rimvio.hub.infrastructure-index.v2";

export const INFRASTRUCTURE_KINDS = [
  "plc",
  "cloud_region",
  "database",
  "device_fleet",
  "supplier_api",
] as const;

export type InfrastructureKind = (typeof INFRASTRUCTURE_KINDS)[number];

export type InfrastructureIndexEntry = {
  readonly id: string;
  readonly name: string;
  readonly kind: InfrastructureKind;
  readonly ownerCreatorId: string;
  readonly status: "pending-review" | "published";
  readonly publishedAtIso: string;
  readonly compatibleRuntimeIds: readonly string[];
};

const INFRA_EVENT = "rimvio:hub-infrastructure-index";

let memoryInfra: InfrastructureIndexEntry[] | null = null;

const SEED: InfrastructureIndexEntry[] = [
  {
    id: "osaka.hotel.supplier",
    name: "Osaka Hotel API",
    kind: "supplier_api",
    ownerCreatorId: "OsakaStay",
    status: "published",
    publishedAtIso: new Date().toISOString(),
    compatibleRuntimeIds: ["rimvio.browser-runtime", "browser.runtime.partner", "rimvio.cloud-runtime"],
  },
  {
    id: "google.maps.places",
    name: "Google Maps Places",
    kind: "supplier_api",
    ownerCreatorId: "Rimvio",
    status: "published",
    publishedAtIso: new Date().toISOString(),
    compatibleRuntimeIds: ["rimvio.browser-runtime", "browser.runtime.partner"],
  },
  {
    id: "hotel.inventory.db",
    name: "Hotel Inventory DB",
    kind: "database",
    ownerCreatorId: "OsakaStay",
    status: "published",
    publishedAtIso: new Date().toISOString(),
    compatibleRuntimeIds: ["rimvio.cloud-runtime", "rimvio.browser-runtime"],
  },
  {
    id: "factory.plc.default",
    name: "Factory PLC Infrastructure",
    kind: "plc",
    ownerCreatorId: "Demo Factory Co",
    status: "published",
    publishedAtIso: new Date().toISOString(),
    compatibleRuntimeIds: ["rimvio.vision-runtime", "factory.runtime"],
  },
];

function emit(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INFRA_EVENT));
  }
}

export function readInfrastructureIndex(): readonly InfrastructureIndexEntry[] {
  if (memoryInfra) return memoryInfra;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(HUB_INFRASTRUCTURE_INDEX_STORAGE_KEY);
      if (raw) {
        memoryInfra = JSON.parse(raw) as InfrastructureIndexEntry[];
        return memoryInfra;
      }
    } catch {
      // ignore
    }
  }
  memoryInfra = [...SEED];
  if (typeof window !== "undefined") {
    localStorage.setItem(HUB_INFRASTRUCTURE_INDEX_STORAGE_KEY, JSON.stringify(memoryInfra));
  }
  return memoryInfra;
}

function persistInfrastructureIndex(entries: InfrastructureIndexEntry[]): void {
  memoryInfra = entries;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HUB_INFRASTRUCTURE_INDEX_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }
  emit();
}

export function slugifyInfrastructureId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
}

export function registerInfrastructureEntry(input: {
  readonly name: string;
  readonly kind: InfrastructureKind;
  readonly ownerCreatorId: string;
  readonly compatibleRuntimeIds: readonly string[];
  readonly status?: InfrastructureIndexEntry["status"];
}): InfrastructureIndexEntry {
  const entry: InfrastructureIndexEntry = {
    id: slugifyInfrastructureId(input.name),
    name: input.name.trim(),
    kind: input.kind,
    ownerCreatorId: input.ownerCreatorId,
    status: input.status ?? "published",
    publishedAtIso: new Date().toISOString(),
    compatibleRuntimeIds: [...input.compatibleRuntimeIds],
  };
  const existing = [...readInfrastructureIndex()].filter((e) => e.id !== entry.id);
  persistInfrastructureIndex([...existing, entry]);
  return entry;
}

export function subscribeInfrastructureIndex(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(INFRA_EVENT, listener);
  return () => window.removeEventListener(INFRA_EVENT, listener);
}
