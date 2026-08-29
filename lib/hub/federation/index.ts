export type {
  ConnectedHub,
  FederatedCapabilityRef,
  FederatedCapabilitySelection,
  CrossHubCompositionPlan,
  RemoteHubScanResult,
  RemoteInvokeResult,
  RemotePermissionGrant,
  CompatibilityCheckResult,
  HubTrustLevel,
  RemoteHubStatus,
} from "@/lib/hub/federation/types";

export {
  listConnectedHubs,
  readConnectedHub,
  upsertConnectedHub,
  removeConnectedHub,
  createConnectedHubDraft,
  clearConnectedHubsForTests,
  seedConnectedHubsForTests,
} from "@/lib/hub/federation/hub-connection-registry";

export { connectRemoteHub, type HubConnectResult } from "@/lib/hub/federation/hub-connect-flow";
export { storeHubCredential, readCredentialRef, clearCredentialVaultForTests } from "@/lib/hub/federation/credential-vault";

export {
  scanRemoteHub,
  readCachedHubScan,
  listAllFederatedCapabilities,
  clearHubScanCacheForTests,
} from "@/lib/hub/federation/discovery/remote-hub-scan";

export {
  checkRemotePermission,
  summarizePermissions,
  filterAllowedCapabilities,
} from "@/lib/hub/federation/permission/delegation-policy";

export { probeHubHealth, healthLabelKo, pickHealthyCapability } from "@/lib/hub/federation/health/hub-health-probe";
export { checkRemoteCompatibility, negotiateProtocolVersion } from "@/lib/hub/federation/health/compatibility-check";

export {
  invokeRemoteCapability,
  invokeWithFailover,
} from "@/lib/hub/federation/execution/remote-invoke-client";

export {
  searchFederatedCapabilities,
  selectBestFederatedCapability,
  planCrossHubComposition,
  summarizeConnectedHubsForAgent,
} from "@/lib/hub/federation/capability-router";

export {
  planFederatedCapabilityDiscovery,
  listFederatedDiscoveryCandidates,
  type FederatedDiscoveryPlan,
} from "@/lib/hub/federation/federated-discovery";

export {
  SHOPPING_HUB,
  SHOPPING_HUB_ID,
  SHOPPING_CAPABILITIES,
  SHOPPING_PERMISSIONS,
  buildShoppingHubScan,
  TRAVEL_PARTNER_HUBS,
} from "@/lib/hub/federation/seeds/shopping-hub-seed";
