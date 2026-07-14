"use client";

import {
  bootstrapInstalledEnginesOnContextMetadata,
  installEngineManifestOnContextMetadata,
  type InstallContextEngineResult,
} from "@/lib/engine/install-context-engine";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { listPublishedEngineManifests } from "@/lib/marketplace/engine-market-registry";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function installEngineManifestToContextClient(input: {
  contextEventId: string;
  manifestId: string;
}): InstallContextEngineResult {
  const event = findLifeEventCandidate(input.contextEventId);
  if (!event) {
    return { ok: false, reason: "context_not_found" };
  }

  const manifest = listPublishedEngineManifests().find(
    (row) => row.manifestId === input.manifestId.trim(),
  );
  if (!manifest) {
    return { ok: false, reason: "engine_manifest_not_found" };
  }

  const result = installEngineManifestOnContextMetadata({
    metadata: event.metadata ?? {},
    manifest,
    event,
  });
  if (!result.ok || result.alreadyInstalled) {
    return result;
  }

  commitEventUpsert({
    ...event,
    metadata: result.metadata,
    updatedAt: new Date().toISOString(),
  });

  return result;
}

export function bootstrapContextInstalledEnginesClient(input: {
  contextEventId: string;
}): { ok: true; engineIds: readonly RimvioEngineId[] } | { ok: false; reason: string } {
  const event = findLifeEventCandidate(input.contextEventId);
  if (!event) {
    return { ok: false, reason: "context_not_found" };
  }

  const boot = bootstrapInstalledEnginesOnContextMetadata({
    metadata: event.metadata ?? {},
    event,
  });

  commitEventUpsert({
    ...event,
    metadata: boot.metadata,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, engineIds: boot.engineIds };
}
