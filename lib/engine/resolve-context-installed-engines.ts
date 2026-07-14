import type { ContextBlueprint } from "@/lib/context-blueprint/types";

import {

  isRimvioEngineId,

  readInstalledEngineRecordsFromMetadata,

  readInstalledEnginesWireFromMetadata,

  type InstalledEngineRecordV1,

} from "@/lib/engine/context-installed-engines-metadata";

import {

  buildBootstrapInstalledEngineRecord,

  buildBootstrapInstalledEngineRecords,

  defaultInstalledEngineIds,

} from "@/lib/engine/default-installed-engines";

import { deriveEngineIdsFromExecutionGraph } from "@/lib/engine/derive-engine-ids-from-execution-graph";

import type { RimvioEnginePackage } from "@/lib/engine/engine-package";

import type { RimvioEngineId } from "@/lib/engine/engine-types";

import { RIMVIO_FIRST_PARTY_ENGINE_PACKAGES } from "@/lib/engine/packages";

import { inferContextContainerKind } from "@/lib/engine/infer-context-container-kind";

import type { EventCandidate } from "@/lib/events/event-candidate";



function lookupEnginePackage(engineId: RimvioEngineId): RimvioEnginePackage | null {

  return RIMVIO_FIRST_PARTY_ENGINE_PACKAGES.find((row) => row.id === engineId) ?? null;

}



function uniqueEngineIds(ids: readonly RimvioEngineId[]): RimvioEngineId[] {

  return [...new Set(ids)];

}



function recordForEngineId(input: {

  engineId: RimvioEngineId;

  recordsByEngineId: Map<RimvioEngineId, InstalledEngineRecordV1>;

}): InstalledEngineRecordV1 {

  return (

    input.recordsByEngineId.get(input.engineId) ??

    buildBootstrapInstalledEngineRecord({ engineId: input.engineId })

  );

}



export function readContextInstalledEngineIds(input: {

  event?: EventCandidate | null;

  blueprint?: ContextBlueprint | null;

}): readonly RimvioEngineId[] {

  const graphIds = deriveEngineIdsFromExecutionGraph(input.blueprint?.executionGraph);

  const wire = readInstalledEnginesWireFromMetadata(input.event?.metadata);



  if (input.blueprint?.executionGraph?.nodes.length) {

    const marketplaceIds =

      wire?.engines

        .filter((row) => row.source === "marketplace" || row.source === "dev")

        .map((row) => row.engineId)

        .filter((id): id is RimvioEngineId => isRimvioEngineId(id)) ?? [];

    if (graphIds.length > 0 || marketplaceIds.length > 0) {

      return uniqueEngineIds([...marketplaceIds, ...graphIds]);

    }

  }



  if (wire) {

    const wireIds = wire.engines

      .map((row) => row.engineId)

      .filter((id): id is RimvioEngineId => isRimvioEngineId(id));

    return uniqueEngineIds([...wireIds, ...graphIds]);

  }



  if (graphIds.length > 0) {

    return graphIds;

  }



  return defaultInstalledEngineIds(inferContextContainerKind(input));

}



/** Records aligned 1:1 with `readContextInstalledEngineIds()` — routing and UI share one set. */

export function readContextInstalledEngineRecords(input: {

  event?: EventCandidate | null;

  blueprint?: ContextBlueprint | null;

}): readonly InstalledEngineRecordV1[] {

  const installedIds = readContextInstalledEngineIds(input);

  const wire = readInstalledEnginesWireFromMetadata(input.event?.metadata);

  const fallbackRecords = wire

    ? wire.engines

    : buildBootstrapInstalledEngineRecords({

        containerKind: inferContextContainerKind(input),

      });

  const recordsByEngineId = new Map<RimvioEngineId, InstalledEngineRecordV1>();

  for (const row of fallbackRecords) {

    if (isRimvioEngineId(row.engineId)) {

      recordsByEngineId.set(row.engineId, row);

    }

  }

  return installedIds.map((engineId) =>

    recordForEngineId({ engineId, recordsByEngineId }),

  );

}



export function isEngineInstalledOnContext(input: {

  engineId: RimvioEngineId;

  event?: EventCandidate | null;

  blueprint?: ContextBlueprint | null;

}): boolean {

  return readContextInstalledEngineIds(input).includes(input.engineId);

}



export function listContextInstalledEnginePackages(input: {

  event?: EventCandidate | null;

  blueprint?: ContextBlueprint | null;

}): RimvioEnginePackage[] {

  const ids = readContextInstalledEngineIds(input);

  return ids

    .map((engineId) => lookupEnginePackage(engineId))

    .filter((row): row is RimvioEnginePackage => row != null);

}



export function resolvePersistedOrBootstrapEngineRecords(input: {

  metadata?: Record<string, unknown> | null;

  containerKind: ReturnType<typeof inferContextContainerKind>;

}): InstalledEngineRecordV1[] {

  const wire = readInstalledEnginesWireFromMetadata(input.metadata);

  if (wire) {

    return [...wire.engines];

  }

  return buildBootstrapInstalledEngineRecords({

    containerKind: input.containerKind,

  });

}


