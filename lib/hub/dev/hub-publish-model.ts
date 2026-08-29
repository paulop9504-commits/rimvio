/**
 * Hub publish certification views.
 *
 * ADR-061: "Certified" = passed Rimvio contract/runtime gates at this tier —
 * NOT a guarantee every composition works in production.
 *
 * Capability Certified (per cap) ≠ Platform Certified (this assembly).
 */
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import {
  resolveIndexStatusFromPublishOptions as resolveLifecycleFromPublishOptions,
  type CapabilityLifecycleStatus,
} from "@/lib/platform-sdk/capability-lifecycle";

export type HubPublishVisibility = "private" | "hub" | "public";

export type HubPublishOptions = {
  readonly visibility: HubPublishVisibility;
  readonly allowAgentAccess: boolean;
  readonly capabilityIds: readonly string[];
};

export type CapabilityCertificationLayer = "logic" | "contract" | "runtime" | "experience";

export type CapabilityCertificationView = {
  readonly capabilityId: string;
  readonly name: string;
  readonly ownerCreatorId: string;
  readonly origin: "platform-bundled" | "standalone";
  readonly layers: Record<CapabilityCertificationLayer, boolean>;
  readonly rimvioCertified: boolean;
};

export type PlatformCertificationView = {
  readonly platformName: string;
  readonly platformId: string;
  readonly capabilities: readonly CapabilityCertificationView[];
  readonly compositionCheck: boolean;
  readonly integrationTest: boolean;
  readonly agentSimulation: boolean;
  readonly endToEnd: boolean;
  readonly platformCertified: boolean;
};

export function defaultPublishOptions(actions: CapabilityAction[]): HubPublishOptions {
  return {
    visibility: "hub",
    allowAgentAccess: true,
    capabilityIds: actions.map((a) => a.id),
  };
}

export function filterManifestCapabilities(
  manifest: RimvioPlatformManifest,
  actions: CapabilityAction[],
  selectedActionIds: readonly string[],
): RimvioPlatformManifest {
  const capNames = new Set(
    actions.filter((a) => selectedActionIds.includes(a.id)).map((a) => a.name),
  );
  if (capNames.size === 0) {
    return manifest;
  }
  return {
    ...manifest,
    capabilities: manifest.capabilities.filter(
      (c) => capNames.has(c.id) || [...capNames].some((n) => c.id.endsWith(n)),
    ),
  };
}

export function buildCapabilityCertificationView(
  action: CapabilityAction,
  input: {
    ownerCreatorId: string;
    origin: "platform-bundled" | "standalone";
    testsPassed: boolean;
    manifestValid: boolean;
  },
): CapabilityCertificationView {
  const hasSchema = Boolean(action.inputSchema && action.outputSchema);
  return {
    capabilityId: action.name,
    name: action.name,
    ownerCreatorId: input.ownerCreatorId,
    origin: input.origin,
    layers: {
      logic: true,
      contract: hasSchema,
      runtime: input.manifestValid,
      experience: hasSchema && action.description.length > 0,
    },
    rimvioCertified: input.testsPassed && hasSchema && input.manifestValid,
  };
}

export function buildPlatformCertificationView(input: {
  manifest: RimvioPlatformManifest;
  actions: CapabilityAction[];
  selectedCapabilityIds: readonly string[];
  ownerCreatorId: string;
  testsPassed: boolean;
  manifestValid: boolean;
}): PlatformCertificationView {
  const selected = input.actions.filter((a) => input.selectedCapabilityIds.includes(a.id));
  const capabilities = selected.map((a) =>
    buildCapabilityCertificationView(a, {
      ownerCreatorId: input.ownerCreatorId,
      origin: "platform-bundled",
      testsPassed: input.testsPassed,
      manifestValid: input.manifestValid,
    }),
  );

  const compositionCheck = selected.length > 0;
  const integrationTest = input.testsPassed;
  const agentSimulation = input.testsPassed;
  const endToEnd = input.testsPassed && input.manifestValid;

  return {
    platformName: input.manifest.package.name,
    platformId: input.manifest.package.id,
    capabilities,
    compositionCheck,
    integrationTest,
    agentSimulation,
    endToEnd,
    platformCertified:
      compositionCheck && integrationTest && agentSimulation && endToEnd,
  };
}

export function resolveIndexStatusFromPublishOptions(
  options: HubPublishOptions,
): CapabilityLifecycleStatus {
  return resolveLifecycleFromPublishOptions({
    visibility: options.visibility,
    allowAgentAccess: options.allowAgentAccess,
  });
}
