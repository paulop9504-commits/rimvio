"use client";

import { syncInstalledEnginesFromBlueprintMetadata } from "@/lib/engine/sync-installed-engines-from-blueprint";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function syncContextInstalledEnginesFromBlueprintClient(input: {
  contextEventId: string;
  blueprint: ContextBlueprint;
}): { ok: true; changed: boolean; engineIds: readonly RimvioEngineId[] } | { ok: false; reason: string } {
  const event = findLifeEventCandidate(input.contextEventId);
  if (!event) {
    return { ok: false, reason: "context_not_found" };
  }

  const sync = syncInstalledEnginesFromBlueprintMetadata({
    metadata: event.metadata ?? {},
    blueprint: input.blueprint,
    event,
  });

  if (sync.changed) {
    commitEventUpsert({
      ...event,
      metadata: sync.metadata,
      updatedAt: new Date().toISOString(),
    });
  }

  return { ok: true, changed: sync.changed, engineIds: sync.engineIds };
}
