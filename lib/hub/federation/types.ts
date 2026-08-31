/**
 * Remote Hub Federation — core types (P0).
 * Peer Rimvio hubs exchanging capabilities, schemas, and execution.
 *
 * Distinct from:
 * - lib/integrations/hub-platform/ (Stripe/GitHub OAuth)
 * - lib/globe/context-hub/ (travel commerce pipeline)
 */

export type HubTrustLevel = "verified" | "partner" | "community" | "sandbox";

export type RemoteHubStatus =
  | "pending_auth"
  | "connected"
  | "scanning"
  | "healthy"
  | "degraded"
  | "offline"
  | "error";

export type RemoteHubAuthKind = "oauth" | "api_key" | "service_account" | "none";

/** Connected peer hub — federation SSOT record. */
export type ConnectedHub = {
  readonly hubId: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly trustLevel: HubTrustLevel;
  readonly status: RemoteHubStatus;
  readonly authKind: RemoteHubAuthKind;
  /** Agent sees credentialRef only — never raw secret. */
  readonly credentialRef: string | null;
  readonly protocolVersion: string;
  readonly rimvioStandardVersion: string;
  readonly connectedAtIso: string;
  readonly lastScanAtIso: string | null;
  readonly lastHealthAtIso: string | null;
  readonly detailKo: string;
};

export type RemoteCapabilityHealth = "healthy" | "degraded" | "offline" | "unknown";

/** Capability discovered on a remote hub. */
export type FederatedCapabilityRef = {
  readonly capabilityId: string;
  readonly hubId: string;
  readonly hubLabel: string;
  readonly platformId: string;
  readonly platformName: string;
  readonly category: string;
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly inputSchemaVersion?: number;
  readonly outputSchemaVersion?: number;
  readonly approvalRequired: boolean;
  readonly keywords: readonly string[];
  readonly health: RemoteCapabilityHealth;
  readonly latencyMsP50?: number;
  readonly origin: "local" | "remote";
  readonly executionEndpoint?: string;
};

export type RemotePlatformSummary = {
  readonly platformId: string;
  readonly platformName: string;
  readonly capabilityCount: number;
  readonly workflowCount: number;
  readonly schemaCount: number;
};

export type RemoteHubScanResult = {
  readonly hub: ConnectedHub;
  readonly platforms: readonly RemotePlatformSummary[];
  readonly capabilities: readonly FederatedCapabilityRef[];
  readonly workflows: readonly { readonly id: string; readonly label: string }[];
  readonly schemas: readonly { readonly id: string; readonly version: string }[];
  readonly permissions: readonly RemotePermissionGrant[];
  readonly versions: readonly { readonly capabilityId: string; readonly schemaVersion: string }[];
  readonly healthSummary: RemoteHubHealthSummary;
  readonly scannedAtIso: string;
};

export type RemotePermissionAction =
  | "read"
  | "write"
  | "prepare"
  | "commit"
  | "invoke";

export type RemotePermissionGrant = {
  readonly capabilityId: string;
  readonly action: RemotePermissionAction;
  readonly allowed: boolean;
  readonly reasonKo?: string;
};

export type RemoteHubHealthSummary = {
  readonly overall: RemoteCapabilityHealth;
  readonly healthyCount: number;
  readonly degradedCount: number;
  readonly offlineCount: number;
  readonly capabilityHealth: Readonly<Record<string, RemoteCapabilityHealth>>;
};

export type RemoteInvokeInput = {
  readonly hubId: string;
  readonly capabilityId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly credentialRef?: string | null;
  readonly approvalPolicy?: "none" | "user_required";
};

export type RemoteInvokeResult = {
  readonly ok: boolean;
  readonly hubId: string;
  readonly capabilityId: string;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly errorKo?: string;
  readonly durationMs: number;
  readonly routedVia: "primary" | "failover";
  readonly attemptedHubIds: readonly string[];
};

export type CompatibilityCheckResult = {
  readonly compatible: boolean;
  readonly hubId: string;
  readonly capabilityId: string;
  readonly localSchemaVersion: string | null;
  readonly remoteSchemaVersion: string | null;
  readonly affectedWorkflows: readonly string[];
  readonly summaryKo: string;
};

export type FederatedCapabilitySelection = {
  readonly capabilityId: string;
  readonly hubId: string;
  readonly hubLabel: string;
  readonly platformId: string;
  readonly platformName: string;
  readonly score: number;
  readonly matchReasonKo: string;
  readonly health: RemoteCapabilityHealth;
  readonly origin: "local" | "remote";
};

export type CrossHubCompositionPlan = {
  readonly goalKo: string;
  readonly steps: readonly FederatedCapabilitySelection[];
  readonly summaryKo: string;
};

/** Rimvio core runtime standard — federation protocol baseline. */
export const RIMVIO_FEDERATION_PROTOCOL_VERSION = "1.0";
export const RIMVIO_FEDERATION_STANDARD_VERSION = "RIMVIO_CORE_RUNTIME_STANDARD/1.0";
