/**
 * Platform contract — manifest + schema facets.
 * docs/RIMVIO_OS_CONSTITUTION.md §8
 */

import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import type { RimvioCapabilityContract } from "@/lib/rimvio-protocol/capability-contract";
import { defaultCapabilityContract } from "@/lib/rimvio-protocol/capability-contract";

export type RimvioPlatformContract = {
  readonly manifest: RimvioPlatformManifest;
  readonly capabilities: readonly RimvioCapabilityContract[];
  readonly manifestVersion: string;
  readonly platformVersion: string;
};

export function buildPlatformContract(manifest: RimvioPlatformManifest): RimvioPlatformContract {
  return {
    manifest,
    manifestVersion: manifest.specVersion,
    platformVersion: manifest.package.version,
    capabilities: manifest.capabilities.map((cap) => defaultCapabilityContract(cap)),
  };
}
