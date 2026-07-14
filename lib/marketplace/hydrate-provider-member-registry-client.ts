"use client";

import { mergeRemoteProviderNetworkMembers } from "@/lib/marketplace/provider-member-registry";
import type { ProviderKind, ProviderNetworkMember } from "@/lib/marketplace/provider-network-types";
import { isProviderKind } from "@/lib/marketplace/provider-network-types";

let hydratePromise: Promise<boolean> | null = null;

function parseRemoteMember(raw: unknown): ProviderNetworkMember | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Partial<ProviderNetworkMember>;
  const memberId = row.memberId?.trim();
  if (!memberId || !row.kind || !isProviderKind(row.kind)) {
    return null;
  }
  return {
    memberId,
    kind: row.kind as ProviderKind,
    displayLabel: row.displayLabel?.trim() || memberId,
    capabilityIds: row.capabilityIds,
    engineManifestIds: row.engineManifestIds,
  };
}

/** Merge remote Provider Network members into the local registry (Engine Store labels). */
export async function hydrateProviderMemberRegistryClient(): Promise<boolean> {
  if (hydratePromise) {
    return hydratePromise;
  }
  hydratePromise = (async () => {
    try {
      const response = await fetch("/api/marketplace/provider-members", {
        credentials: "include",
      });
      if (!response.ok) {
        return false;
      }
      const body = (await response.json()) as { members?: unknown[] };
      if (!Array.isArray(body.members) || body.members.length === 0) {
        return false;
      }
      const members = body.members
        .map(parseRemoteMember)
        .filter((row): row is ProviderNetworkMember => row != null);
      if (members.length === 0) {
        return false;
      }
      mergeRemoteProviderNetworkMembers(members);
      return true;
    } catch {
      return false;
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}
