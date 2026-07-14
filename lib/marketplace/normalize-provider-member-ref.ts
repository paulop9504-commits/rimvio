import type { ProviderMemberRef } from "@/lib/marketplace/provider-network-types";
import type {
  CapabilityInvocationRecord,
  PublishedCapabilityPackage,
  PublishedEngineManifest,
} from "@/lib/marketplace/marketplace-contract";

/** Resolve Provider Network member id — providerMemberId wins, else publisherId. */
export function readProviderMemberId(ref: ProviderMemberRef): string {
  const explicit = ref.providerMemberId?.trim();
  if (explicit) {
    return explicit;
  }
  return ref.publisherId.trim();
}

/** Ensure both providerMemberId and publisherId are populated (alias sync). */
export function withProviderMemberRef<T extends ProviderMemberRef>(
  row: T,
): T & { providerMemberId: string; publisherId: string } {
  const memberId = readProviderMemberId(row);
  return {
    ...row,
    providerMemberId: memberId,
    publisherId: row.publisherId?.trim() || memberId,
  };
}

export function normalizePublishedEngineManifest(
  manifest: PublishedEngineManifest,
): PublishedEngineManifest {
  return withProviderMemberRef(manifest);
}

export function normalizePublishedCapabilityPackage(
  pkg: PublishedCapabilityPackage,
): PublishedCapabilityPackage {
  return withProviderMemberRef(pkg);
}

export function normalizeCapabilityInvocationRecord(
  record: CapabilityInvocationRecord,
): CapabilityInvocationRecord {
  return withProviderMemberRef(record);
}
