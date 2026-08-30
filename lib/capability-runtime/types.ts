/**
 * Capability Connector / Runtime Adapter.
 * Main Agent sees Capability ID only — never source, never GitHub token.
 */

import type { CertificationLevel } from "@/lib/hub/standards/types";
import type { CapabilityPermissionLevel } from "@/lib/trust-pipeline/types";

export const CAPABILITY_DEPLOY_MODELS = [
  "rimvio_hosted",
  "private_artifact",
  "dev_hosted",
] as const;

export type CapabilityDeployModel = (typeof CAPABILITY_DEPLOY_MODELS)[number];

export const DEFAULT_CAPABILITY_DEPLOY_MODEL: CapabilityDeployModel = "private_artifact";

export type CapabilityContract = {
  readonly capabilityId: string;
  readonly version: string;
  readonly inputSchemaId: string;
  readonly outputSchemaId: string;
  readonly permissionLevel: CapabilityPermissionLevel;
  readonly trust: CertificationLevel;
  readonly deployModel: CapabilityDeployModel;
  readonly secretRefs: readonly string[];
  readonly sourceVisible: false;
};

export type GitHubRepoConnector = {
  readonly kind: "github_app";
  readonly installationId: string;
  readonly owner: string;
  readonly repo: string;
  readonly permissions: readonly ["contents:read"];
  readonly accountWide: false;
};

export type SignedCapabilityArtifact = {
  readonly artifactId: string;
  readonly capabilityId: string;
  readonly digestSha256: string;
  readonly signature: string;
  readonly builtAtIso: string;
  readonly sourceRepo?: string;
};

export type SecretReference = {
  readonly ref: string;
  readonly ownerProducerId: string;
  readonly capabilityId: string;
};

export type CapabilityInvokeRequest = {
  readonly capabilityId: string;
  readonly agentId: string;
  readonly input: Readonly<Record<string, unknown>>;
};

export type CapabilityInvokeLog = {
  readonly lines: readonly string[];
};

export type CapabilityInvokeResult = {
  readonly ok: boolean;
  readonly capabilityId: string;
  readonly output: Readonly<Record<string, unknown>> | null;
  readonly latencyMs: number;
  readonly errorKo?: string;
  readonly logs: CapabilityInvokeLog;
  readonly usedSecretRefs: readonly string[];
};

export type BlackBoxObservation = {
  readonly inputOk: boolean;
  readonly outputOk: boolean;
  readonly latencyMs: number;
  readonly errorCount: number;
  readonly undeclaredNetwork: boolean;
  readonly permissionOk: boolean;
};

export type BlackBoxVerifyResult = {
  readonly passed: boolean;
  readonly observations: BlackBoxObservation;
  readonly reasonKo: string;
};
