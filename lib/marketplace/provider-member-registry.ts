/**
 * Derived Provider Network member directory — merges on manifest/capability publish.
 * Wire SSOT remains manifest embed (`providerMemberId`); this is an index for lookup/rollup.
 * @see docs/RIMVIO_PROVIDER_NETWORK.md · docs/RIMVIO_STACK_ALIGNMENT.md
 */

import type {
  PublishedCapabilityPackage,
  PublishedEngineManifest,
} from "@/lib/marketplace/marketplace-contract";
import { readProviderMemberId } from "@/lib/marketplace/normalize-provider-member-ref";
import {
  isProviderKind,
  type ProviderKind,
  type ProviderNetworkMember,
} from "@/lib/marketplace/provider-network-types";

const members = new Map<string, ProviderNetworkMember>();

/** Curated first-party / partner members — displayLabel is L2; UI maps L1 via copy. */
const SEED_PROVIDER_MEMBERS: readonly ProviderNetworkMember[] = [
  {
    memberId: "rimvio",
    kind: "ai_agent",
    displayLabel: "Rimvio",
  },
  {
    memberId: "kakao-corp",
    kind: "organization",
    displayLabel: "Kakao",
  },
  {
    memberId: "naver-corp",
    kind: "organization",
    displayLabel: "Naver",
  },
  {
    memberId: "acme_hotels",
    kind: "organization",
    displayLabel: "ACME Hotels",
  },
];

let bootstrapped = false;

function uniqueStrings(
  ...groups: (readonly string[] | undefined)[]
): readonly string[] {
  return [...new Set(groups.flatMap((group) => group ?? []))];
}

function normalizeMember(member: ProviderNetworkMember): ProviderNetworkMember {
  const memberId = member.memberId.trim();
  return {
    memberId,
    kind: member.kind,
    displayLabel: member.displayLabel.trim() || memberId,
    capabilityIds: member.capabilityIds?.length
      ? uniqueStrings(member.capabilityIds)
      : undefined,
    engineManifestIds: member.engineManifestIds?.length
      ? uniqueStrings(member.engineManifestIds)
      : undefined,
  };
}

function mergeMembers(
  base: ProviderNetworkMember,
  incoming: {
    kind?: ProviderKind;
    displayLabel?: string;
    capabilityIds?: readonly string[];
    engineManifestIds?: readonly string[];
  },
  options: { preferIncomingMeta?: boolean } = {},
): ProviderNetworkMember {
  const preferIncoming = options.preferIncomingMeta === true;
  const kind =
    preferIncoming && incoming.kind
      ? incoming.kind
      : base.kind ?? incoming.kind ?? "organization";
  const displayLabel =
    preferIncoming && incoming.displayLabel?.trim()
      ? incoming.displayLabel.trim()
      : base.displayLabel.trim() || incoming.displayLabel?.trim() || base.memberId;

  return normalizeMember({
    memberId: base.memberId,
    kind,
    displayLabel,
    capabilityIds: uniqueStrings(base.capabilityIds, incoming.capabilityIds),
    engineManifestIds: uniqueStrings(
      base.engineManifestIds,
      incoming.engineManifestIds,
    ),
  });
}

function upsertMember(
  incoming: ProviderNetworkMember,
  options: { preferIncomingMeta?: boolean; syncSupabase?: boolean } = {},
): ProviderNetworkMember {
  const normalized = normalizeMember(incoming);
  const existing = members.get(normalized.memberId);
  const merged = existing
    ? mergeMembers(existing, normalized, options)
    : normalized;
  members.set(merged.memberId, merged);
  if (options.syncSupabase !== false) {
    scheduleProviderMemberSupabaseSync(merged);
  }
  return merged;
}

function scheduleProviderMemberSupabaseSync(member: ProviderNetworkMember): void {
  if (typeof window !== "undefined") {
    return;
  }
  void import("@/lib/marketplace/server/sync-provider-network-member-supabase")
    .then(({ syncProviderNetworkMemberToSupabase }) =>
      syncProviderNetworkMemberToSupabase(member),
    )
    .catch(() => undefined);
}

function inferKindForMemberId(memberId: string): ProviderKind {
  const seeded = SEED_PROVIDER_MEMBERS.find((row) => row.memberId === memberId);
  if (seeded) {
    return seeded.kind;
  }
  if (memberId === "rimvio") {
    return "ai_agent";
  }
  return "organization";
}

function ensureProviderMemberRegistryBootstrapped(): void {
  if (bootstrapped) {
    return;
  }
  for (const row of SEED_PROVIDER_MEMBERS) {
    upsertMember(row);
  }
  bootstrapped = true;
}

export function registerProviderNetworkMember(
  member: ProviderNetworkMember,
): { ok: true; member: ProviderNetworkMember } | { ok: false; reason: string } {
  ensureProviderMemberRegistryBootstrapped();
  const memberId = member.memberId.trim();
  if (!memberId) {
    return { ok: false, reason: "member_id_required" };
  }
  if (!isProviderKind(member.kind)) {
    return { ok: false, reason: "invalid_provider_kind" };
  }
  const registered = upsertMember(normalizeMember(member), {
    preferIncomingMeta: true,
  });
  return { ok: true, member: registered };
}

export function indexProviderMemberFromEngineManifest(
  manifest: PublishedEngineManifest,
): ProviderNetworkMember {
  ensureProviderMemberRegistryBootstrapped();
  const memberId = readProviderMemberId(manifest);
  return upsertMember({
    memberId,
    kind: manifest.providerKind ?? inferKindForMemberId(memberId),
    displayLabel: memberId,
    capabilityIds: [...manifest.capabilityIds],
    engineManifestIds: [manifest.manifestId],
  });
}

export function indexProviderMemberFromCapabilityPackage(
  pkg: PublishedCapabilityPackage,
): ProviderNetworkMember {
  ensureProviderMemberRegistryBootstrapped();
  const memberId = readProviderMemberId(pkg);
  return upsertMember({
    memberId,
    kind: pkg.providerKind ?? inferKindForMemberId(memberId),
    displayLabel: memberId,
    capabilityIds: [pkg.capabilityId],
  });
}

export function getProviderNetworkMember(
  memberId: string,
): ProviderNetworkMember | null {
  ensureProviderMemberRegistryBootstrapped();
  const trimmed = memberId.trim();
  if (!trimmed) {
    return null;
  }
  return members.get(trimmed) ?? null;
}

export function listProviderNetworkMembers(input?: {
  kind?: ProviderKind;
}): readonly ProviderNetworkMember[] {
  ensureProviderMemberRegistryBootstrapped();
  const rows = [...members.values()].sort((left, right) =>
    left.displayLabel.localeCompare(right.displayLabel, "en"),
  );
  if (!input?.kind) {
    return rows;
  }
  return rows.filter((row) => row.kind === input.kind);
}

/** Merge Supabase (or API) rows into the local derived index — local seeds win on meta conflict. */
export function mergeRemoteProviderNetworkMembers(
  remote: readonly ProviderNetworkMember[],
): number {
  ensureProviderMemberRegistryBootstrapped();
  let merged = 0;
  for (const row of remote) {
    upsertMember(normalizeMember(row), {
      preferIncomingMeta: false,
      syncSupabase: false,
    });
    merged += 1;
  }
  return merged;
}

export function resetProviderMemberRegistryForTests(): void {
  members.clear();
  bootstrapped = false;
}
