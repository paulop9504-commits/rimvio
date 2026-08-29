/**
 * Hub Adapter Store — Runtime ↔ Infrastructure bridge (ADR-062 MVP).
 */

export const HUB_ADAPTER_INDEX_STORAGE_KEY = "rimvio.hub.adapter-index.v2";

export type AdapterIndexEntry = {
  readonly id: string;
  readonly name: string;
  readonly runtimeId: string;
  readonly infrastructureId: string;
  readonly ownerCreatorId: string;
  readonly status: "pending-review" | "published" | "verified";
  readonly publishedAtIso: string;
};

const ADAPTER_EVENT = "rimvio:hub-adapter-index";

let memoryAdapters: AdapterIndexEntry[] | null = null;

const SEED: AdapterIndexEntry[] = [
  {
    id: "adapter.browser-hotel",
    name: "Browser Runtime → Osaka Hotel API",
    runtimeId: "rimvio.browser-runtime",
    infrastructureId: "osaka.hotel.supplier",
    ownerCreatorId: "OsakaStay",
    status: "verified",
    publishedAtIso: new Date().toISOString(),
  },
  {
    id: "adapter.browser-maps",
    name: "Browser Runtime → Google Maps",
    runtimeId: "rimvio.browser-runtime",
    infrastructureId: "google.maps.places",
    ownerCreatorId: "Rimvio",
    status: "verified",
    publishedAtIso: new Date().toISOString(),
  },
  {
    id: "adapter.cloud-hotel-db",
    name: "Cloud Runtime → Hotel DB",
    runtimeId: "rimvio.cloud-runtime",
    infrastructureId: "hotel.inventory.db",
    ownerCreatorId: "OsakaStay",
    status: "published",
    publishedAtIso: new Date().toISOString(),
  },
  {
    id: "adapter.vision-plc",
    name: "Vision Runtime → Factory PLC",
    runtimeId: "rimvio.vision-runtime",
    infrastructureId: "factory.plc.default",
    ownerCreatorId: "Rimvio",
    status: "verified",
    publishedAtIso: new Date().toISOString(),
  },
];

function emit(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADAPTER_EVENT));
  }
}

export function readAdapterIndex(): readonly AdapterIndexEntry[] {
  if (memoryAdapters) return memoryAdapters;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(HUB_ADAPTER_INDEX_STORAGE_KEY);
      if (raw) {
        memoryAdapters = JSON.parse(raw) as AdapterIndexEntry[];
        return memoryAdapters;
      }
    } catch {
      // ignore
    }
  }
  memoryAdapters = [...SEED];
  if (typeof window !== "undefined") {
    localStorage.setItem(HUB_ADAPTER_INDEX_STORAGE_KEY, JSON.stringify(memoryAdapters));
  }
  return memoryAdapters;
}

function persistAdapterIndex(entries: AdapterIndexEntry[]): void {
  memoryAdapters = entries;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HUB_ADAPTER_INDEX_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }
  emit();
}

export function registerAdapterEntry(input: {
  readonly name: string;
  readonly runtimeId: string;
  readonly infrastructureId: string;
  readonly ownerCreatorId: string;
  readonly status?: AdapterIndexEntry["status"];
}): AdapterIndexEntry {
  const slug = `${input.runtimeId}-${input.infrastructureId}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const entry: AdapterIndexEntry = {
    id: `adapter.${slug}`,
    name: input.name.trim(),
    runtimeId: input.runtimeId,
    infrastructureId: input.infrastructureId,
    ownerCreatorId: input.ownerCreatorId,
    status: input.status ?? "published",
    publishedAtIso: new Date().toISOString(),
  };
  const existing = [...readAdapterIndex()].filter((e) => e.id !== entry.id);
  persistAdapterIndex([...existing, entry]);
  return entry;
}

export function subscribeAdapterIndex(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ADAPTER_EVENT, listener);
  return () => window.removeEventListener(ADAPTER_EVENT, listener);
}
