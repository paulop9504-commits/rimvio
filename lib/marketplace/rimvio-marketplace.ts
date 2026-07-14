/**
 * Rimvio Marketplace — public ecosystem entry.
 * @see docs/RIMVIO_MARKETPLACE_V1_REPORT.md
 */
export {
  MARKETPLACE_CONTRACT_VERSION,
  type MarketplaceDomain,
  type PublishedEngineManifest,
  type PublishedCapabilityPackage,
  type SurfaceTemplatePack,
  type MarketplacePluginListing,
  type CapabilityInvocationRecord,
  type InstalledMarketplaceModule,
  type PricingModel,
  type ProviderKind,
} from "@/lib/marketplace/marketplace-contract";

export {
  PROVIDER_KINDS,
  USER_MARKET_ROLES,
  type ProviderNetworkMember,
  type ProviderMemberRef,
  type UserMarketRole,
  isProviderKind,
} from "@/lib/marketplace/provider-network-types";

export {
  readProviderMemberId,
  withProviderMemberRef,
  normalizePublishedEngineManifest,
  normalizePublishedCapabilityPackage,
  normalizeCapabilityInvocationRecord,
} from "@/lib/marketplace/normalize-provider-member-ref";

export {
  readContextCapabilityInvocationsFromMetadata,
  appendContextCapabilityInvocationToMetadata,
  type ContextCapabilityInvocationV1,
} from "@/lib/marketplace/context-capability-invocation-metadata";

export { recordContextCapabilityInvocation } from "@/lib/marketplace/record-context-capability-invocation";

export { formatProviderMemberLabel } from "@/lib/marketplace/format-provider-member-label";

export {
  buildCapabilityInvocationTimelineRows,
  formatCapabilityInvocationTimelineLabel,
  capabilityInvocationPriority,
} from "@/lib/marketplace/format-capability-invocation-timeline";

export {
  rollupInvocationsByProviderMember,
  type ProviderMemberInvocationRollup,
} from "@/lib/marketplace/rollup-invocations-by-provider-member";

export {
  registerProviderNetworkMember,
  getProviderNetworkMember,
  listProviderNetworkMembers,
  mergeRemoteProviderNetworkMembers,
  indexProviderMemberFromEngineManifest,
  indexProviderMemberFromCapabilityPackage,
  resetProviderMemberRegistryForTests,
} from "@/lib/marketplace/provider-member-registry";

export { hydrateProviderMemberRegistryClient } from "@/lib/marketplace/hydrate-provider-member-registry-client";

export {
  publishCapabilityPackage,
  listPublishedCapabilities,
  getPublishedCapabilityPackage,
  listCapabilityVersions,
  getProviderReputation,
  resetCapabilityMarketRegistryForTests,
} from "@/lib/marketplace/capability-market-registry";

export {
  publishEngineManifest,
  listPublishedEngineManifests,
  getPublishedEngineManifest,
  resolveEngineCapabilityIds,
  syncEngineManifestExecutionNodes,
  resetEngineMarketRegistryForTests,
} from "@/lib/marketplace/engine-market-registry";

export {
  publishSurfacePack,
  listSurfacePacks,
  getSurfacePack,
  isSurfacePackCompatible,
  resetSurfaceTemplateStoreForTests,
} from "@/lib/marketplace/surface-template-store";

export {
  publishPluginListing,
  discoverPlugins,
  getPluginListing,
  checkPluginStoreCompatibility,
  resetPluginStoreForTests,
} from "@/lib/marketplace/plugin-store";

export {
  installCapabilityPackage,
  installSurfacePack,
  installMarketplacePlugin,
  marketplaceDispatch,
  listInstalledModules,
  type MarketplaceDispatchInput,
  type MarketplaceDispatchResult,
  resetMarketplaceRuntimeForTests,
} from "@/lib/marketplace/marketplace-runtime";

export {
  recordCapabilityInvocation,
  getUsageSummary,
  getProviderRevenue,
  computeCostPerAction,
  attributeRevenue,
  resetMonetizationLayerForTests,
} from "@/lib/marketplace/capability-monetization-layer";

export { selectFairProvider } from "@/lib/marketplace/provider-selection";

export {
  bootstrapContextInstalledEnginesClient,
  installEngineManifestToContextClient,
} from "@/lib/engine/install-context-engine-client";
export {
  installEngineManifestOnContextMetadata,
  type InstallContextEngineResult,
} from "@/lib/engine/install-context-engine";
export {
  readContextInstalledEngineIds,
  listContextInstalledEnginePackages,
} from "@/lib/engine/resolve-context-installed-engines";

export function bootstrapMarketplace(): { ok: true } {
  return { ok: true };
}

import { resetEngineMarketRegistryForTests } from "@/lib/marketplace/engine-market-registry";
import { resetCapabilityMarketRegistryForTests } from "@/lib/marketplace/capability-market-registry";
import { resetProviderMemberRegistryForTests } from "@/lib/marketplace/provider-member-registry";
import { resetSurfaceTemplateStoreForTests } from "@/lib/marketplace/surface-template-store";
import { resetPluginStoreForTests } from "@/lib/marketplace/plugin-store";
import { resetMarketplaceRuntimeForTests } from "@/lib/marketplace/marketplace-runtime";
import { resetMonetizationLayerForTests } from "@/lib/marketplace/capability-monetization-layer";

export function resetMarketplaceForTests(): void {
  resetCapabilityMarketRegistryForTests();
  resetEngineMarketRegistryForTests();
  resetProviderMemberRegistryForTests();
  resetSurfaceTemplateStoreForTests();
  resetPluginStoreForTests();
  resetMarketplaceRuntimeForTests();
  resetMonetizationLayerForTests();
}
