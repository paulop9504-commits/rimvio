/**
 * Connected Hub registry — client SSOT (localStorage → Supabase later).
 */

import type { ConnectedHub, RemoteHubStatus } from "@/lib/hub/federation/types";
import { RIMVIO_FEDERATION_PROTOCOL_VERSION, RIMVIO_FEDERATION_STANDARD_VERSION } from "@/lib/hub/federation/types";

const STORAGE_KEY = "rimvio.federation.connected-hubs.v1";
const HUB_EVENT = "rimvio:federation-hubs-updated";

let memoryHubs: ConnectedHub[] = [];

function readStored(): ConnectedHub[] {
  if (typeof window === "undefined") return memoryHubs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryHubs;
    memoryHubs = JSON.parse(raw) as ConnectedHub[];
    return memoryHubs;
  } catch {
    return memoryHubs;
  }
}

function persist(hubs: ConnectedHub[]): void {
  memoryHubs = hubs;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hubs));
    window.dispatchEvent(new CustomEvent(HUB_EVENT));
  } catch {
    // quota
  }
}

export function listConnectedHubs(): readonly ConnectedHub[] {
  return readStored();
}

export function readConnectedHub(hubId: string): ConnectedHub | null {
  return readStored().find((h) => h.hubId === hubId) ?? null;
}

export function upsertConnectedHub(hub: ConnectedHub): ConnectedHub {
  const list = readStored();
  const idx = list.findIndex((h) => h.hubId === hub.hubId);
  const next = idx >= 0 ? list.map((h, i) => (i === idx ? hub : h)) : [...list, hub];
  persist(next);
  return hub;
}

export function removeConnectedHub(hubId: string): void {
  persist(readStored().filter((h) => h.hubId !== hubId));
}

export function updateHubStatus(hubId: string, status: RemoteHubStatus, detailKo?: string): ConnectedHub | null {
  const hub = readConnectedHub(hubId);
  if (!hub) return null;
  return upsertConnectedHub({
    ...hub,
    status,
    detailKo: detailKo ?? hub.detailKo,
    lastHealthAtIso: new Date().toISOString(),
  });
}

export function createConnectedHubDraft(input: {
  readonly hubId: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly trustLevel?: ConnectedHub["trustLevel"];
  readonly authKind?: ConnectedHub["authKind"];
}): ConnectedHub {
  const now = new Date().toISOString();
  return {
    hubId: input.hubId,
    label: input.label,
    baseUrl: input.baseUrl.replace(/\/$/, ""),
    trustLevel: input.trustLevel ?? "partner",
    status: "pending_auth",
    authKind: input.authKind ?? "oauth",
    credentialRef: null,
    protocolVersion: RIMVIO_FEDERATION_PROTOCOL_VERSION,
    rimvioStandardVersion: RIMVIO_FEDERATION_STANDARD_VERSION,
    connectedAtIso: now,
    lastScanAtIso: null,
    lastHealthAtIso: null,
    detailKo: "연결 대기",
  };
}

/** Test-only reset. */
export function clearConnectedHubsForTests(): void {
  memoryHubs = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function seedConnectedHubsForTests(hubs: readonly ConnectedHub[]): void {
  persist([...hubs]);
}
