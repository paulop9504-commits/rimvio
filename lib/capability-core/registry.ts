/**
 * Capability Core registry — re-export Hub index + publish helpers.
 */

import {
  persistCapabilityIndex,
  readCapabilityIndex,
  registerCapabilityIndexFromManifestWithValidation,
  searchCapabilityIndex,
  subscribeCapabilityIndex,
  type CapabilityIndexEntry,
} from "@/lib/platform-sdk/capability-index";
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import type { HubCapabilitySummary } from "./types";

export {
  readCapabilityIndex,
  persistCapabilityIndex,
  searchCapabilityIndex,
  subscribeCapabilityIndex,
  registerCapabilityIndexFromManifestWithValidation,
};

export function publishStandaloneCapabilityEntry(
  entry: CapabilityIndexEntry,
): readonly CapabilityIndexEntry[] {
  const index = readCapabilityIndex().filter((row) => row.capabilityId !== entry.capabilityId);
  persistCapabilityIndex([...index, entry]);
  return readCapabilityIndex();
}

export function publishCapabilityFromManifest(
  manifest: RimvioPlatformManifest,
): ReturnType<typeof registerCapabilityIndexFromManifestWithValidation> {
  return registerCapabilityIndexFromManifestWithValidation(manifest);
}

export function listPublishedCapabilitySummaries(
  fixtureSummaries: readonly HubCapabilitySummary[] = [],
): HubCapabilitySummary[] {
  const fixtureIds = new Set(fixtureSummaries.map((row) => row.capabilityId));
  const fromIndex: HubCapabilitySummary[] = readCapabilityIndex()
    .filter((row) => !fixtureIds.has(row.capabilityId))
    .map((row) => ({
      capabilityId: row.capabilityId,
      label: row.capabilityId,
      description: `${row.platformName} · ${row.category}`,
      status: row.status,
      approvalRequired: row.approvalRequired,
      source: "index" as const,
    }));

  return [...fixtureSummaries, ...fromIndex];
}
