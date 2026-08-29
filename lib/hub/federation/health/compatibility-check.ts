/**
 * Version / compatibility check — schema drift + affected workflows (P0).
 */

import type { CompatibilityCheckResult, FederatedCapabilityRef } from "@/lib/hub/federation/types";
import { isAgentCompatibleWithSchema } from "@/lib/platform-sdk/capability-schema-version";

export function checkRemoteCompatibility(input: {
  readonly hubId: string;
  readonly capability: FederatedCapabilityRef;
  readonly localSchemaVersion?: string | null;
  readonly knownWorkflows?: readonly string[];
}): CompatibilityCheckResult {
  const remoteVersion = input.capability.outputSchema;
  const localVersion = input.localSchemaVersion ?? null;
  const schemaChanged = localVersion !== null && localVersion !== remoteVersion;

  const agentCompatible = isAgentCompatibleWithSchema(remoteVersion);

  const affectedWorkflows =
    schemaChanged && input.knownWorkflows
      ? input.knownWorkflows.filter((w) => w.includes(input.capability.capabilityId))
      : [];

  const compatible = agentCompatible && !schemaChanged;

  return {
    compatible,
    hubId: input.hubId,
    capabilityId: input.capability.capabilityId,
    localSchemaVersion: localVersion,
    remoteSchemaVersion: remoteVersion,
    affectedWorkflows,
    summaryKo: compatible
      ? "호환됨"
      : schemaChanged
        ? `⚠ ${input.capability.capabilityId} schema 변경 · ${affectedWorkflows.length} workflow 영향`
        : "Agent schema 호환 불가",
  };
}

export function negotiateProtocolVersion(input: {
  readonly localVersion: string;
  readonly remoteVersion: string;
}): { readonly ok: boolean; readonly summaryKo: string } {
  const localMajor = input.localVersion.split("/")[0];
  const remoteMajor = input.remoteVersion.split("/")[0];
  if (localMajor !== remoteMajor) {
    return { ok: false, summaryKo: `Protocol mismatch: ${input.localVersion} vs ${input.remoteVersion}` };
  }
  return { ok: true, summaryKo: "Protocol compatible" };
}
