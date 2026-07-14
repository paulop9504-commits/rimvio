import type { ContextContainerKind } from "@/lib/context-blueprint/blueprint-constants";
import type { InstalledEngineRecordV1 } from "@/lib/engine/context-installed-engines-metadata";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { RIMVIO_ENGINE_IDS } from "@/lib/engine/engine-types";
import { listPublishedEngineManifests } from "@/lib/marketplace/engine-market-registry";
import type { PublishedEngineManifest } from "@/lib/marketplace/marketplace-contract";

/** Default Engine SKUs per project container — virtual until persisted. */
export const DEFAULT_INSTALLED_ENGINE_IDS_BY_CONTAINER: Readonly<
  Record<ContextContainerKind, readonly RimvioEngineId[]>
> = {
  travel: [
    "flight_booking",
    "lodging_search",
    "local_amenity_search",
    "eatery_search",
    "activity_search",
    "trip_experience_search",
    "transit_navigate",
    "finance_prep",
  ],
  finance: ["finance_prep"],
  trade: [],
  medical: [],
  education: [],
  work: [],
  smart_home: [],
  generic: [...RIMVIO_ENGINE_IDS],
};

export function defaultInstalledEngineIds(
  containerKind: ContextContainerKind,
): readonly RimvioEngineId[] {
  return DEFAULT_INSTALLED_ENGINE_IDS_BY_CONTAINER[containerKind] ?? [];
}

function primaryManifestForEngine(
  engineId: RimvioEngineId,
): PublishedEngineManifest | null {
  return listPublishedEngineManifests(engineId)[0] ?? null;
}

export function buildBootstrapInstalledEngineRecord(input: {
  engineId: RimvioEngineId;
  now?: Date;
}): InstalledEngineRecordV1 {
  const manifest = primaryManifestForEngine(input.engineId);
  const stamp = (input.now ?? new Date()).toISOString();
  return {
    engineId: input.engineId,
    manifestId: manifest?.manifestId ?? `bootstrap-${input.engineId}`,
    version: manifest?.version ?? "1.0.0",
    providerId: manifest?.providerId ?? "rimvio",
    installedAtIso: stamp,
    source: "bootstrap",
  };
}

export function buildBootstrapInstalledEngineRecords(input: {
  containerKind: ContextContainerKind;
  now?: Date;
}): InstalledEngineRecordV1[] {
  return defaultInstalledEngineIds(input.containerKind).map((engineId) =>
    buildBootstrapInstalledEngineRecord({ engineId, now: input.now }),
  );
}
