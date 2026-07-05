import type { LodgingAgentContainer } from "@/lib/globe/lodging-agent/types";

const STORAGE_KEY = "rimvio.lodging-agent-session.v1";

export type LodgingAgentSessionWire = {
  contextEventId: string;
  lodgingResourceId: string;
  hostPlaceId: string;
  hostName: string;
  atIso: string;
};

export function writeLodgingAgentSession(
  container: LodgingAgentContainer,
): LodgingAgentSessionWire {
  const wire: LodgingAgentSessionWire = {
    contextEventId: container.contextEventId,
    lodgingResourceId: container.lodgingResourceId,
    hostPlaceId: container.host.placeId,
    hostName: container.host.name,
    atIso: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wire));
  }
  return wire;
}

export function readLodgingAgentSession(): LodgingAgentSessionWire | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as LodgingAgentSessionWire;
    if (!parsed.contextEventId?.trim() || !parsed.lodgingResourceId?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLodgingAgentSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
