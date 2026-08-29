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
  registerCapabilityIndexFromManifestWithValidation,
  searchCapabilityIndex,
  subscribeCapabilityIndex,
  type CapabilityIndexEntry,
  type CapabilityIndexPublishResult,
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

export {
  parseSchemaRef,
  validateSchemaPublishTransition,
  isAgentCompatibleWithSchema,
  schemaVersionFields,
  RIMVIO_AGENT_SCHEMA_RUNTIME,
  type ParsedSchemaRef,
  type SchemaPublishValidation,
} from "@/lib/platform-sdk/capability-schema-version";

export {
  DISCOVERY_CACHE_TTL_MS,
  getCachedIntent,
  getCachedIndexSearch,
  getCachedRankingPlan,
  clearDiscoveryCacheForTests,
} from "@/lib/platform-sdk/discovery-cache";

export {
  CAPABILITY_APPROVAL_PENDING_STORAGE_KEY,
  CAPABILITY_APPROVAL_PENDING_TTL_MS,
  createCapabilityApprovalPending,
  readCapabilityApprovalPending,
  clearCapabilityApprovalPending,
  commitCapabilityApprovalPending,
  subscribeCapabilityApprovalPending,
  clearCapabilityApprovalPendingForTests,
  type CapabilityApprovalPending,
} from "@/lib/platform-sdk/capability-approval-pending";

export {
  normalizeCapabilityOutput,
  fuseCanonicalResults,
  type RimvioCanonicalItem,
  type RimvioCanonicalPrice,
} from "@/lib/platform-sdk/canonical-capability-result";

export {
  classifyCapability,
  capabilityClassLabelKo,
  inferDomainFromCapabilityId,
  type CapabilityClass,
} from "@/lib/platform-sdk/capability-classification";

export {
  resolveCapabilityExposurePolicy,
  planCapabilityExposure,
  filterHitsForExposure,
  type CapabilityExposurePolicy,
  type CapabilityExposurePlan,
  type CapabilityExposureStep,
} from "@/lib/platform-sdk/capability-exposure-policy";

export {
  resolveExecutionStage,
  isCapabilityDiscoverableAtStage,
  isCapabilityExecutableAtStage,
  type CapabilityExecutionStage,
} from "@/lib/platform-sdk/capability-execution-lifecycle";

export {
  projectCapabilityExperience,
  summarizeExposurePipeline,
  type RimvioExperienceProjection,
} from "@/lib/platform-sdk/capability-ui-projection";
