import type { ProviderKind, ProviderNetworkMember } from "@/lib/marketplace/provider-network-types";
import { isProviderKind } from "@/lib/marketplace/provider-network-types";

export type ProviderNetworkMemberDbRow = {
  member_id: string;
  kind: string;
  display_label: string;
  capability_ids: string[] | null;
  engine_manifest_ids: string[] | null;
  created_at: string;
  updated_at: string;
};

export function providerNetworkMemberToDbPayload(
  member: ProviderNetworkMember,
): Omit<ProviderNetworkMemberDbRow, "created_at" | "updated_at"> & {
  updated_at: string;
} {
  return {
    member_id: member.memberId.trim(),
    kind: member.kind,
    display_label: member.displayLabel.trim() || member.memberId.trim(),
    capability_ids: member.capabilityIds ? [...member.capabilityIds] : [],
    engine_manifest_ids: member.engineManifestIds ? [...member.engineManifestIds] : [],
    updated_at: new Date().toISOString(),
  };
}

export function providerNetworkMemberFromDbRow(
  row: ProviderNetworkMemberDbRow,
): ProviderNetworkMember | null {
  const memberId = row.member_id?.trim();
  if (!memberId || !isProviderKind(row.kind)) {
    return null;
  }
  return {
    memberId,
    kind: row.kind as ProviderKind,
    displayLabel: row.display_label?.trim() || memberId,
    capabilityIds: row.capability_ids?.length ? [...row.capability_ids] : undefined,
    engineManifestIds: row.engine_manifest_ids?.length
      ? [...row.engine_manifest_ids]
      : undefined,
  };
}
