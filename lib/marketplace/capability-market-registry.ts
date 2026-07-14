import type {
  CapabilityPricing,
  ProviderReputation,
  PublishedCapabilityPackage,
} from "@/lib/marketplace/marketplace-contract";
import { normalizePublishedCapabilityPackage } from "@/lib/marketplace/normalize-provider-member-ref";
import { indexProviderMemberFromCapabilityPackage } from "@/lib/marketplace/provider-member-registry";

const packages = new Map<string, PublishedCapabilityPackage>();
const reputationByProvider = new Map<string, ProviderReputation>();

function packageKey(capabilityId: string, version: string, providerId: string): string {
  return `${capabilityId}@${version}#${providerId}`;
}

function defaultReputation(providerId: string): ProviderReputation {
  return {
    providerId,
    reliabilityScore: 0.7,
    speedScore: 0.7,
    costScore: 0.7,
    invocationCount: 0,
    successCount: 0,
  };
}

export function publishCapabilityPackage(
  pkg: PublishedCapabilityPackage,
): { ok: true } | { ok: false; reason: string } {
  const key = packageKey(pkg.capabilityId, pkg.version, pkg.providerId);
  if (packages.has(key)) {
    return { ok: false, reason: "capability_version_conflict" };
  }
  const normalized = normalizePublishedCapabilityPackage(pkg);
  packages.set(key, normalized);
  reputationByProvider.set(normalized.providerId, normalized.reputation);
  indexProviderMemberFromCapabilityPackage(normalized);
  return { ok: true };
}

export function getPublishedCapabilityPackage(
  capabilityId: string,
  version: string,
  providerId: string,
): PublishedCapabilityPackage | null {
  return packages.get(packageKey(capabilityId, version, providerId)) ?? null;
}

export function listPublishedCapabilities(
  capabilityId?: string,
): readonly PublishedCapabilityPackage[] {
  const rows = [...packages.values()];
  if (!capabilityId) {
    return rows;
  }
  return rows.filter((row) => row.capabilityId === capabilityId);
}

export function listCapabilityVersions(capabilityId: string): readonly string[] {
  const versions = new Set<string>();
  for (const row of packages.values()) {
    if (row.capabilityId === capabilityId) {
      versions.add(row.version);
    }
  }
  return [...versions].sort();
}

export function getProviderReputation(providerId: string): ProviderReputation {
  return reputationByProvider.get(providerId) ?? defaultReputation(providerId);
}

export function recordProviderOutcome(
  providerId: string,
  input: { success: boolean; latencyMs?: number; costUnits?: number },
): ProviderReputation {
  const current = getProviderReputation(providerId);
  const invocations = current.invocationCount + 1;
  const successes = current.successCount + (input.success ? 1 : 0);
  const reliabilityScore = Math.round((successes / invocations) * 1000) / 1000;
  const speedScore = input.latencyMs
    ? Math.max(0, Math.min(1, 1 - input.latencyMs / 5000))
    : current.speedScore;
  const costScore =
    input.costUnits !== undefined
      ? Math.max(0, Math.min(1, 1 - input.costUnits / 100))
      : current.costScore;

  const next: ProviderReputation = {
    providerId,
    reliabilityScore,
    speedScore,
    costScore,
    invocationCount: invocations,
    successCount: successes,
  };
  reputationByProvider.set(providerId, next);
  return next;
}

export function estimatePackagePricing(
  pkg: PublishedCapabilityPackage,
  invocations: number,
): number {
  if (pkg.pricing.model === "free") {
    return 0;
  }
  return Math.round(pkg.pricing.unitCost * invocations * 1000) / 1000;
}

export function resetCapabilityMarketRegistryForTests(): void {
  packages.clear();
  reputationByProvider.clear();
}
