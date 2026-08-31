/**
 * Platform ↔ third-party Capability compatibility grants.
 * Ownership stays with each Creator; compatibility is a separate approval edge.
 */

export const HUB_COMPATIBILITY_REGISTRY_KEY = "rimvio.hub.compatibility-registry.v1";

export type CompatibilityGrantStatus = "pending" | "approved" | "rejected";

export type CompatibilityGrant = {
  readonly id: string;
  readonly platformId: string;
  readonly platformName: string;
  readonly platformOwnerId: string;
  readonly capabilityId: string;
  readonly capabilityOwnerId: string;
  readonly status: CompatibilityGrantStatus;
  readonly createdAtIso: string;
};

const REGISTRY_EVENT = "rimvio:hub-compatibility-registry";

let memoryGrants: CompatibilityGrant[] | null = null;

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REGISTRY_EVENT));
  }
}

export function readCompatibilityGrants(): readonly CompatibilityGrant[] {
  if (memoryGrants) return memoryGrants;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(HUB_COMPATIBILITY_REGISTRY_KEY);
      if (raw) {
        memoryGrants = JSON.parse(raw) as CompatibilityGrant[];
        return memoryGrants;
      }
    } catch {
      // fall through
    }
  }
  memoryGrants = [];
  return memoryGrants;
}

function persist(grants: CompatibilityGrant[]): void {
  memoryGrants = grants;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HUB_COMPATIBILITY_REGISTRY_KEY, JSON.stringify(grants));
    } catch {
      // ignore
    }
  }
  emitChange();
}

export function requestCompatibilityGrant(input: {
  platformId: string;
  platformName: string;
  platformOwnerId: string;
  capabilityId: string;
  capabilityOwnerId: string;
}): CompatibilityGrant {
  const grant: CompatibilityGrant = {
    id: `compat_${Date.now()}`,
    ...input,
    status: "pending",
    createdAtIso: new Date().toISOString(),
  };
  persist([...readCompatibilityGrants(), grant]);
  return grant;
}

export function approveCompatibilityGrant(id: string): void {
  persist(
    readCompatibilityGrants().map((g) =>
      g.id === id ? { ...g, status: "approved" as const } : g,
    ),
  );
}

export function listApprovedCapabilitiesForPlatform(
  platformId: string,
): readonly CompatibilityGrant[] {
  return readCompatibilityGrants().filter(
    (g) => g.platformId === platformId && g.status === "approved",
  );
}

export function listCompatiblePlatformsForCapability(
  capabilityId: string,
): readonly CompatibilityGrant[] {
  return readCompatibilityGrants().filter(
    (g) => g.capabilityId === capabilityId && g.status === "approved",
  );
}

export function subscribeCompatibilityRegistry(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(REGISTRY_EVENT, handler);
  return () => window.removeEventListener(REGISTRY_EVENT, handler);
}
