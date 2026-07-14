import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import {
  readInstalledEngineRecordsFromMetadata,
  type InstalledEngineRecordV1,
  writeInstalledEnginesWireToMetadata,
} from "@/lib/engine/context-installed-engines-metadata";
import { buildBootstrapInstalledEngineRecord } from "@/lib/engine/default-installed-engines";
import { deriveEngineIdsFromExecutionGraph } from "@/lib/engine/derive-engine-ids-from-execution-graph";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import {
  CONTEXT_CONTAINER_KIND_META_KEY,
  inferContextContainerKind,
} from "@/lib/engine/infer-context-container-kind";
import type { EventCandidate } from "@/lib/events/event-candidate";

const MANAGED_INSTALL_SOURCES = new Set<InstalledEngineRecordV1["source"]>([
  "marketplace",
  "dev",
]);

function buildGraphSyncInstallRecord(input: {
  engineId: RimvioEngineId;
  now?: Date;
}): InstalledEngineRecordV1 {
  const base = buildBootstrapInstalledEngineRecord(input);
  return {
    ...base,
    manifestId: base.manifestId.startsWith("bootstrap-")
      ? `graph-sync-${input.engineId}`
      : base.manifestId,
    source: "graph_sync",
  };
}

function mergeInstallRecords(
  records: readonly InstalledEngineRecordV1[],
): InstalledEngineRecordV1[] {
  const byEngine = new Map<RimvioEngineId, InstalledEngineRecordV1>();
  for (const record of records) {
    byEngine.set(record.engineId, record);
  }
  return [...byEngine.values()];
}

function recordsEqual(
  left: readonly InstalledEngineRecordV1[],
  right: readonly InstalledEngineRecordV1[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightIds = new Set(right.map((row) => row.engineId));
  return left.every((row) => rightIds.has(row.engineId));
}

/** Blueprint executionGraph → contextInstalledEnginesV1 (graph_sync + preserved marketplace/dev). */
export function syncInstalledEnginesFromBlueprintMetadata(input: {
  metadata?: Record<string, unknown> | null;
  blueprint: ContextBlueprint;
  event?: EventCandidate | null;
  now?: Date;
}): {
  metadata: Record<string, unknown>;
  engineIds: readonly RimvioEngineId[];
  changed: boolean;
} {
  const graphEngineIds = deriveEngineIdsFromExecutionGraph(input.blueprint.executionGraph);
  const priorRecords = readInstalledEngineRecordsFromMetadata(input.metadata);

  const preserved = priorRecords.filter((row) => MANAGED_INSTALL_SOURCES.has(row.source));
  const graphRecords = graphEngineIds.map((engineId) => {
    const existing = priorRecords.find((row) => row.engineId === engineId);
    if (existing && MANAGED_INSTALL_SOURCES.has(existing.source)) {
      return existing;
    }
    return buildGraphSyncInstallRecord({ engineId, now: input.now });
  });

  const nextRecords = mergeInstallRecords([...preserved, ...graphRecords]);

  let metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    [CONTEXT_CONTAINER_KIND_META_KEY]: input.blueprint.containerKind,
  };

  const changed =
    !recordsEqual(priorRecords, nextRecords) ||
    inferContextContainerKind({ event: input.event, blueprint: input.blueprint }) !==
      input.blueprint.containerKind ||
    input.metadata?.[CONTEXT_CONTAINER_KIND_META_KEY] !== input.blueprint.containerKind;

  metadata = writeInstalledEnginesWireToMetadata({
    metadata,
    wire: { version: 1, engines: nextRecords },
  });

  return {
    metadata,
    engineIds: nextRecords.map((row) => row.engineId),
    changed,
  };
}
