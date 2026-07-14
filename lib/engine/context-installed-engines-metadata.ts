/**
 * Per-Context installed Engine packages — Engine Store wire on EventCandidate.metadata.
 * @see docs/RIMVIO_ENGINE.md
 */

import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { RIMVIO_ENGINE_IDS } from "@/lib/engine/engine-types";

export const CONTEXT_INSTALLED_ENGINES_META_KEY = "contextInstalledEnginesV1" as const;

export const INSTALLED_ENGINE_SOURCES = ["bootstrap", "marketplace", "graph_sync", "dev"] as const;

export type InstalledEngineSource = (typeof INSTALLED_ENGINE_SOURCES)[number];

export type InstalledEngineRecordV1 = {
  readonly engineId: RimvioEngineId;
  readonly manifestId: string;
  readonly version: string;
  readonly providerId: string;
  readonly installedAtIso: string;
  readonly source: InstalledEngineSource;
};

export type ContextInstalledEnginesWireV1 = {
  readonly version: 1;
  readonly engines: readonly InstalledEngineRecordV1[];
};

export function isRimvioEngineId(value: string): value is RimvioEngineId {
  return (RIMVIO_ENGINE_IDS as readonly string[]).includes(value);
}

function parseInstalledRecord(raw: unknown): InstalledEngineRecordV1 | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Partial<InstalledEngineRecordV1>;
  if (
    typeof row.engineId !== "string" ||
    !isRimvioEngineId(row.engineId) ||
    typeof row.manifestId !== "string" ||
    !row.manifestId.trim() ||
    typeof row.version !== "string" ||
    typeof row.providerId !== "string" ||
    typeof row.installedAtIso !== "string" ||
    typeof row.source !== "string" ||
    !INSTALLED_ENGINE_SOURCES.includes(row.source as InstalledEngineSource)
  ) {
    return null;
  }
  return {
    engineId: row.engineId,
    manifestId: row.manifestId.trim(),
    version: row.version.trim(),
    providerId: row.providerId.trim(),
    installedAtIso: row.installedAtIso,
    source: row.source as InstalledEngineSource,
  };
}

function asInstalledEnginesWire(
  value: unknown,
): ContextInstalledEnginesWireV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ContextInstalledEnginesWireV1>;
  if (row.version !== 1 || !Array.isArray(row.engines)) {
    return null;
  }
  const engines = row.engines
    .map(parseInstalledRecord)
    .filter((record): record is InstalledEngineRecordV1 => record != null);
  return { version: 1, engines };
}

export function readInstalledEnginesWireFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ContextInstalledEnginesWireV1 | null {
  return asInstalledEnginesWire(metadata?.[CONTEXT_INSTALLED_ENGINES_META_KEY]);
}

export function readInstalledEngineRecordsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): readonly InstalledEngineRecordV1[] {
  return readInstalledEnginesWireFromMetadata(metadata)?.engines ?? [];
}

export function hasExplicitInstalledEnginesWire(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return readInstalledEnginesWireFromMetadata(metadata) != null;
}

export function writeInstalledEnginesWireToMetadata(input: {
  metadata?: Record<string, unknown> | null;
  wire: ContextInstalledEnginesWireV1;
}): Record<string, unknown> {
  const next = { ...(input.metadata ?? {}) };
  next[CONTEXT_INSTALLED_ENGINES_META_KEY] = input.wire;
  return next;
}

export function appendInstalledEngineRecord(input: {
  metadata?: Record<string, unknown> | null;
  record: InstalledEngineRecordV1;
}): Record<string, unknown> {
  const prior = readInstalledEngineRecordsFromMetadata(input.metadata);
  const withoutDup = prior.filter((row) => row.engineId !== input.record.engineId);
  const wire: ContextInstalledEnginesWireV1 = {
    version: 1,
    engines: [...withoutDup, input.record],
  };
  return writeInstalledEnginesWireToMetadata({
    metadata: input.metadata,
    wire,
  });
}
