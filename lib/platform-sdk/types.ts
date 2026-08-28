/**
 * Rimvio Platform SDK — unified manifest & API types (SSOT).
 * Canonical spec: docs/RIMVIO_PLATFORM_SDK_SPEC.md · ADR-054
 */

import type {
  PlatformMarketCode,
  PlatformMarketDeployment,
  PlatformMarketsDeclaration,
  PlatformOperatorDeclaration,
} from "@/lib/platform-sdk/markets";

export type {
  PlatformMarketCode,
  PlatformMarketDeployment,
  PlatformMarketsDeclaration,
  PlatformOperatorDeclaration,
  PlatformMarketStatus,
  MarketReadinessCheckpoint,
  MarketReadinessState,
  PlatformMarketContextPolicy,
} from "@/lib/platform-sdk/markets";

export const RIMVIO_PLATFORM_MANIFEST_VERSION = "rimvio.platform.manifest.v1" as const;

export type RimvioPlatformManifestVersion = typeof RIMVIO_PLATFORM_MANIFEST_VERSION;

export type PlatformRuntimeTier = "native" | "sandbox" | "external";

export type PlatformRuntimeType =
  | "pc-agent"
  | "cloud-agent"
  | "remote-agent"
  | "mobile-agent"
  | "api-tool";

export type PlatformPricingModel = "free" | "freemium" | "paid" | "usage-based";

export type PlatformCategory =
  | "e-commerce"
  | "productivity"
  | "finance"
  | "communication"
  | "developer-tools"
  | "travel"
  | "media"
  | "other";

export type DataIsolationPolicy = "tenant_strict" | "tenant_shared_read";

/** Static manifest permission declaration (Hub step 3). */
export type PlatformPermissionDeclaration = {
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly denied: readonly string[];
};

/** Context field grant — path must exist in context catalog at publish time. */
export type ContextGrant = {
  readonly path: string;
  readonly type: string;
};

export type PlatformContextDeclaration = {
  readonly read: readonly ContextGrant[];
  readonly write: readonly ContextGrant[];
};

export type DataCollectionDeclaration = {
  readonly name: string;
  readonly schema: string;
  readonly indexes?: readonly string[];
};

export type PlatformDataDeclaration = {
  readonly collections: readonly DataCollectionDeclaration[];
  readonly isolation: DataIsolationPolicy;
};

/** Agent-discoverable unit — Hub step 2 / Capability API SSOT. */
export type CapabilityDeclaration = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly approvalRequired: boolean;
  /** Markets where this capability is enabled; omit = all approved deployments */
  readonly markets?: readonly PlatformMarketCode[];
  /** Synthesized from collection CRUD when omitted at author time. */
  readonly synthesized?: boolean;
};

export type PlatformUiRoute = {
  readonly path: string;
  readonly surface: "page" | "sheet" | "modal";
  readonly component: string;
};

export type PlatformUiDeclaration = {
  readonly routes: readonly PlatformUiRoute[];
};

/** Cross-platform capability import — composition graph edge. */
export type PlatformCompositionImport = {
  readonly platformId: string;
  readonly capabilities: readonly string[];
};

export type PlatformCompositionDeclaration = {
  readonly imports: readonly PlatformCompositionImport[];
};

export type PlatformEventsDeclaration = {
  readonly emits: readonly string[];
  readonly subscribes: readonly string[];
};

export type PlatformPackageDeclaration = {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: PlatformCategory;
  readonly tags: readonly string[];
  readonly pricing: PlatformPricingModel;
  readonly icon: string | null;
};

export type PlatformRuntimeDeclaration = {
  readonly tier: PlatformRuntimeTier;
  readonly type: PlatformRuntimeType;
  readonly entry: string;
  readonly hostVersion: string;
  /** L3 external only */
  readonly endpoint?: string;
};

/** Unified publish document — single SSOT for Hub + Runtime + Agent discovery. */
export type RimvioPlatformManifest = {
  readonly specVersion: RimvioPlatformManifestVersion;
  readonly package: PlatformPackageDeclaration;
  readonly operator?: PlatformOperatorDeclaration;
  readonly markets: PlatformMarketsDeclaration;
  readonly runtime: PlatformRuntimeDeclaration;
  readonly permissions: PlatformPermissionDeclaration;
  readonly context: PlatformContextDeclaration;
  readonly data: PlatformDataDeclaration;
  readonly capabilities: readonly CapabilityDeclaration[];
  readonly ui: PlatformUiDeclaration;
  readonly composition: PlatformCompositionDeclaration;
  readonly events: PlatformEventsDeclaration;
};

export type CapabilityInvokeRequest = {
  readonly capabilityId: string;
  readonly platformId: string;
  readonly input: Record<string, unknown>;
  readonly approvalPolicy: "none" | "user_required" | "field_commit";
  readonly contextEventId?: string | null;
};

export type CapabilityInvokeResult = {
  readonly ok: boolean;
  readonly capabilityId: string;
  readonly platformId: string;
  readonly output?: Record<string, unknown>;
  readonly errorKo?: string;
  readonly prepareOnly: true;
};

export type DataCreateRequest = {
  readonly platformId: string;
  readonly collection: string;
  readonly document: Record<string, unknown>;
  readonly ownerUserId: string;
};

export type DataSearchRequest = {
  readonly platformId: string;
  readonly collection: string;
  readonly where?: Record<string, unknown>;
  readonly near?: { readonly lat: number; readonly lng: number };
  readonly radiusKm?: number;
  readonly limit?: number;
};

export type ContextReadRequest = {
  readonly platformId: string;
  readonly paths: readonly string[];
  readonly contextEventId?: string | null;
};

export type ContextReadResult = {
  readonly values: Record<string, unknown>;
  readonly granted: readonly string[];
  readonly denied: readonly string[];
};
