import {
  hasExplicitInstalledEnginesWire,
  isRimvioEngineId,
  readInstalledEngineRecordsFromMetadata,
  type InstalledEngineRecordV1,
  type InstalledEngineSource,
  writeInstalledEnginesWireToMetadata,
} from "@/lib/engine/context-installed-engines-metadata";
import { resolvePersistedOrBootstrapEngineRecords } from "@/lib/engine/resolve-context-installed-engines";
import { inferContextContainerKind } from "@/lib/engine/infer-context-container-kind";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { RIMVIO_FIRST_PARTY_ENGINE_PACKAGES } from "@/lib/engine/packages";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { PublishedEngineManifest } from "@/lib/marketplace/marketplace-contract";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type InstallContextEngineResult =
  | {
      ok: true;
      engineId: RimvioEngineId;
      record: InstalledEngineRecordV1;
      metadata: Record<string, unknown>;
      alreadyInstalled: boolean;
    }
  | { ok: false; reason: string };

function buildInstallRecord(input: {
  manifest: PublishedEngineManifest;
  source: InstalledEngineSource;
  now?: Date;
}): InstalledEngineRecordV1 {
  const stamp = (input.now ?? new Date()).toISOString();
  return {
    engineId: input.manifest.engineId as RimvioEngineId,
    manifestId: input.manifest.manifestId,
    version: input.manifest.version,
    providerId: input.manifest.providerId,
    installedAtIso: stamp,
    source: input.source,
  };
}

export function installEngineManifestOnContextMetadata(input: {
  metadata?: Record<string, unknown> | null;
  manifest: PublishedEngineManifest;
  event?: EventCandidate | null;
  blueprint?: ContextBlueprint | null;
  source?: InstalledEngineSource;
  now?: Date;
}): InstallContextEngineResult {
  const engineId = input.manifest.engineId;
  if (
    !isRimvioEngineId(engineId) ||
    !RIMVIO_FIRST_PARTY_ENGINE_PACKAGES.some((row) => row.id === engineId)
  ) {
    return { ok: false, reason: "engine_package_not_registered" };
  }

  const containerKind = inferContextContainerKind({
    event: input.event,
    blueprint: input.blueprint,
  });

  const priorRecords = hasExplicitInstalledEnginesWire(input.metadata)
    ? readInstalledEngineRecordsFromMetadata(input.metadata)
    : resolvePersistedOrBootstrapEngineRecords({
        metadata: input.metadata,
        containerKind,
      });

  const existing = priorRecords.find((row) => row.engineId === engineId);
  if (existing?.manifestId === input.manifest.manifestId) {
    return {
      ok: true,
      engineId: engineId as RimvioEngineId,
      record: existing,
      metadata: input.metadata ?? {},
      alreadyInstalled: true,
    };
  }

  const record = buildInstallRecord({
    manifest: input.manifest,
    source: input.source ?? "marketplace",
    now: input.now,
  });

  const withoutEngine = priorRecords.filter((row) => row.engineId !== engineId);
  const metadata = writeInstalledEnginesWireToMetadata({
    metadata: input.metadata,
    wire: {
      version: 1,
      engines: [...withoutEngine, record],
    },
  });

  return {
    ok: true,
    engineId: engineId as RimvioEngineId,
    record,
    metadata,
    alreadyInstalled: false,
  };
}

export function bootstrapInstalledEnginesOnContextMetadata(input: {
  metadata?: Record<string, unknown> | null;
  event?: EventCandidate | null;
  blueprint?: ContextBlueprint | null;
  now?: Date;
}): { metadata: Record<string, unknown>; engineIds: readonly RimvioEngineId[] } {
  const containerKind = inferContextContainerKind({
    event: input.event,
    blueprint: input.blueprint,
  });
  const records = resolvePersistedOrBootstrapEngineRecords({
    metadata: input.metadata,
    containerKind,
  });
  const metadata = writeInstalledEnginesWireToMetadata({
    metadata: input.metadata,
    wire: { version: 1, engines: records },
  });
  return {
    metadata,
    engineIds: records.map((row) => row.engineId),
  };
}
