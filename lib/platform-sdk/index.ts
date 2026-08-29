export {
  RIMVIO_PLATFORM_MANIFEST_VERSION,
  type RimvioPlatformManifest,
  type CapabilityDeclaration,
  type CapabilityInvokeRequest,
  type CapabilityInvokeResult,
  type ContextGrant,
  type ContextReadRequest,
  type ContextReadResult,
  type DataCollectionDeclaration,
  type PlatformRuntimeTier,
  type PlatformPermissionDeclaration,
} from "@/lib/platform-sdk/types";

export {
  FORBIDDEN_PLATFORM_PERMISSIONS,
  PLATFORM_PERMISSION_CATALOG,
  computePlatformSecurityImpact,
  isForbiddenPlatformPermission,
  classifyPlatformPermission,
  type PlatformPermissionDefinition,
  type PlatformPermissionRisk,
} from "@/lib/platform-sdk/permissions";

export {
  validateRimvioPlatformManifest,
  synthesizeCapabilitiesFromCollections,
  buildCapabilityIndexEntry,
  type ManifestValidationResult,
} from "@/lib/platform-sdk/manifest";

export {
  STUB_PLATFORM_HOST_APIS,
  type RimvioPlatformHostApis,
  type RimvioPlatformDataApi,
  type RimvioPlatformContextApi,
  type RimvioPlatformCapabilityApi,
} from "@/lib/platform-sdk/host-apis";

export {
  mountPlatformHostApis,
  readPlatformHostApis,
  registerPlatformManifest,
  resolvePlatformManifestFromIndex,
  subscribePlatformManifest,
  clearPlatformHostForTests,
} from "@/lib/platform-sdk/platform-host";

export {
  HUB_CAPABILITY_INDEX_STORAGE_KEY,
  readCapabilityIndex,
  registerCapabilityIndexFromManifest,
  searchCapabilityIndex,
  subscribeCapabilityIndex,
  type CapabilityIndexEntry,
  type CapabilityIndexStatus,
  type CapabilitySearchHit,
} from "@/lib/platform-sdk/capability-index";

export {
  planCapabilityDiscovery,
  planCapabilityDiscoveryFromHits,
  type CapabilityDiscoveryPlan,
} from "@/lib/platform-sdk/discover-capabilities";

export {
  createTenantDataApi,
  clearTenantDataForTests,
  readTenantCollectionSize,
} from "@/lib/platform-sdk/tenant-data-store";

export {
  MARKET_CATALOG,
  PLATFORM_MARKET_CODES,
  createDefaultMarketDeployment,
  createDefaultMarketsDeclaration,
  synthesizeMarketsDeclaration,
  computeMarketReadinessPercent,
  canPublishAnyMarket,
  marketsBlockingPublishKo,
  type PlatformMarketCode,
  type PlatformMarketDeployment,
  type PlatformMarketsDeclaration,
  type PlatformOperatorDeclaration,
} from "@/lib/platform-sdk/markets";

export {
  DEFAULT_USER_MARKET_CONTEXT,
  resolveUserMarketForPlatform,
  inferUserMarketFromUtterance,
  mergeUserMarketContext,
  type UserMarketContext,
} from "@/lib/platform-sdk/user-market-context";

export {
  CAPABILITY_LIFECYCLE_STATUSES,
  isAgentDiscoverableCapability,
  normalizeCapabilityLifecycleStatus,
  resolveIndexStatusFromPublishOptions,
  lifecycleLabelKo,
  type CapabilityLifecycleStatus,
} from "@/lib/platform-sdk/capability-lifecycle";

export {
  scoreCapabilityForDiscovery,
  rankCapabilityDiscovery,
  inferDiscoveryIntentDomain,
  type CapabilityDiscoveryScoreBreakdown,
} from "@/lib/platform-sdk/score-capability-discovery";

export {
  resolveCapabilityExecution,
  type CapabilityExecutionResolution,
} from "@/lib/platform-sdk/resolve-capability-execution";

export {
  resolveCapabilityRuntimeRequirements,
  type CapabilityRuntimeRequirements,
} from "@/lib/platform-sdk/runtime-requirements";
