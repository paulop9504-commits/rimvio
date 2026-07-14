export const MARKETPLACE_CONTRACT_VERSION = 1 as const;

import type { ProviderKind } from "@/lib/marketplace/provider-network-types";
export type { ProviderKind } from "@/lib/marketplace/provider-network-types";

export type MarketplaceDomain =
  | "travel"
  | "finance"
  | "scheduling"
  | "productivity"
  | "communication"
  | "generic";

export type PricingModel = "free" | "per_action" | "subscription" | "enterprise_pack";

export type CapabilityPricing = {
  model: PricingModel;
  /** Cost units per successful action (deterministic accounting). */
  unitCost: number;
  currency?: string;
};

export type ProviderReputation = {
  providerId: string;
  reliabilityScore: number;
  speedScore: number;
  costScore: number;
  invocationCount: number;
  successCount: number;
};

export type PublishedEngineManifest = {
  manifestId: string;
  engineId: string;
  version: string;
  /** Execution adapter SKU — fair selection · API routing. */
  providerId: string;
  /** Provider Network member id (SSOT). */
  providerMemberId?: string;
  /** @deprecated Alias for providerMemberId — v1 wire compat. */
  publisherId: string;
  /** Optional supply-side classification. */
  providerKind?: ProviderKind;
  description: string;
  capabilityIds: readonly string[];
  executionNodeIds: readonly string[];
  pricing: CapabilityPricing;
  reputation: ProviderReputation;
  publishedAt: string;
};

export type PublishedCapabilityPackage = {
  packageId: string;
  capabilityId: string;
  version: string;
  providerId: string;
  providerMemberId?: string;
  /** @deprecated Alias for providerMemberId — v1 wire compat. */
  publisherId: string;
  providerKind?: ProviderKind;
  description: string;
  pricing: CapabilityPricing;
  reputation: ProviderReputation;
  publishedAt: string;
};

export type SurfaceTemplate = {
  templateId: string;
  title: string;
  primaryCapabilityId: string;
  surfaceType: string;
  contextRules: readonly string[];
};

export type SurfaceTemplatePack = {
  packId: string;
  name: string;
  version: string;
  domain: MarketplaceDomain;
  templates: readonly SurfaceTemplate[];
  compatibleRuntime: readonly ("v1" | "v2")[];
  publishedAt: string;
};

export type MarketplacePluginListing = {
  listingId: string;
  pluginId: string;
  name: string;
  latestVersion: string;
  versions: readonly string[];
  compatibleRuntime: readonly ("v1" | "v2")[];
  capabilityIds: readonly string[];
  publishedAt: string;
};

export type CapabilityInvocationRecord = {
  invocationId: string;
  capabilityId: string;
  providerId: string;
  providerMemberId?: string;
  /** @deprecated Alias for providerMemberId — v1 wire compat. */
  publisherId: string;
  costUnits: number;
  success: boolean;
  timestamp: string;
};

export type InstalledMarketplaceModule = {
  moduleId: string;
  kind: "capability" | "surface_pack" | "plugin";
  version: string;
  installedAt: string;
};
