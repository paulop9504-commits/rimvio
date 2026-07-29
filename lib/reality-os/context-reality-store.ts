/**
 * Per-Context Reality OS bundle — composition + progressive reveal state.
 * Memory cache + Event metadata hydrate (survives reload).
 * Durable Object graph SSOT remains `lib/reality-object` / session graph.
 * @see docs/adr/034-reality-os-primitives-projection.md
 */

import { findEventCandidate } from "@/lib/events/event-store";
import type { RealityComposition } from "@/lib/reality-os/compose";
import { composeRealityForSdkKind } from "@/lib/reality-os/compose";
import {
  REALITY_PRIMITIVES,
  realityPrimitiveDef,
  type RealityPrimitiveId,
} from "@/lib/reality-os/primitives";
import {
  projectRealityComposition,
  revealFocusSlot,
  type RealityProjection,
} from "@/lib/reality-os/project";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { WorkspaceSdkKind } from "@/lib/workspace-sdk/types";

export const CONTEXT_REALITY_BUNDLE_VERSION = 1 as const;
export const CONTEXT_REALITY_BUNDLE_META_KEY = "realityOsBundleV1";

export type ContextRealityBundle = {
  readonly version: typeof CONTEXT_REALITY_BUNDLE_VERSION;
  readonly contextEventId: string;
  readonly composition: RealityComposition;
  /** Focus slots the user (or Agent) has opened into the projection. */
  readonly revealedSlotIds: readonly string[];
  readonly focusSlotId: string;
  readonly updatedAtIso: string;
};

const memory = new Map<string, ContextRealityBundle>();

const SDK_KINDS = new Set<string>(["travel", "driver", "used_goods"]);

function isPrimitiveId(value: unknown): value is RealityPrimitiveId {
  return (
    typeof value === "string" &&
    (REALITY_PRIMITIVES as readonly string[]).includes(value)
  );
}

function parseBundleFromUnknown(
  raw: unknown,
  contextEventId: string,
): ContextRealityBundle | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  if (row.version !== 1) {
    return null;
  }
  const compositionRaw = row.composition;
  if (!compositionRaw || typeof compositionRaw !== "object") {
    return null;
  }
  const composition = compositionRaw as Record<string, unknown>;
  const labelKind = composition.labelKind;
  if (typeof labelKind !== "string" || !SDK_KINDS.has(labelKind)) {
    return null;
  }
  const primitivesRaw = composition.primitives;
  if (!Array.isArray(primitivesRaw) || primitivesRaw.length === 0) {
    return null;
  }
  const primitives = primitivesRaw.filter(isPrimitiveId);
  if (primitives.length === 0) {
    return null;
  }
  const revealed = Array.isArray(row.revealedSlotIds)
    ? row.revealedSlotIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];
  const focusSlotId =
    typeof row.focusSlotId === "string" ? row.focusSlotId.trim() : "";
  const fallback = composeRealityForSdkKind(labelKind as WorkspaceSdkKind);
  return {
    version: CONTEXT_REALITY_BUNDLE_VERSION,
    contextEventId,
    composition: {
      version: 1,
      labelKind: labelKind as WorkspaceSdkKind,
      primitives,
      defaultMorphologyId:
        typeof composition.defaultMorphologyId === "string"
          ? (composition.defaultMorphologyId as RealityComposition["defaultMorphologyId"])
          : fallback.defaultMorphologyId,
      coreQuestionKo:
        typeof composition.coreQuestionKo === "string"
          ? composition.coreQuestionKo
          : fallback.coreQuestionKo,
    },
    revealedSlotIds: revealed,
    focusSlotId,
    updatedAtIso:
      typeof row.updatedAtIso === "string"
        ? row.updatedAtIso
        : new Date().toISOString(),
  };
}

function hydrateFromEvent(contextEventId: string): ContextRealityBundle | null {
  const event = findEventCandidate(contextEventId);
  const raw = event?.metadata?.[CONTEXT_REALITY_BUNDLE_META_KEY];
  const parsed = parseBundleFromUnknown(raw, contextEventId);
  if (!parsed) {
    return null;
  }
  memory.set(contextEventId, parsed);
  return parsed;
}

function persistToEvent(bundle: ContextRealityBundle): void {
  const event = findEventCandidate(bundle.contextEventId);
  if (!event) {
    return;
  }
  commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: {
      ...event.metadata,
      [CONTEXT_REALITY_BUNDLE_META_KEY]: {
        version: bundle.version,
        composition: bundle.composition,
        revealedSlotIds: bundle.revealedSlotIds,
        focusSlotId: bundle.focusSlotId,
        updatedAtIso: bundle.updatedAtIso,
      },
    },
  });
}

export function readContextRealityBundle(
  contextEventId: string,
): ContextRealityBundle | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  const cached = memory.get(id);
  if (cached) {
    return cached;
  }
  return hydrateFromEvent(id);
}

export function writeContextRealityBundle(
  bundle: ContextRealityBundle,
): void {
  const id = bundle.contextEventId.trim();
  if (!id) {
    return;
  }
  const next = { ...bundle, contextEventId: id };
  memory.set(id, next);
  persistToEvent(next);
}

export function clearContextRealityBundle(contextEventId: string): void {
  memory.delete(contextEventId.trim());
}

export function resetContextRealityStoreForTests(): void {
  memory.clear();
}

/**
 * Seed progressive Reality bundle on Continuum create/open.
 * Reveals first Focus only — full domain UI is forbidden (ADR-034).
 */
export function seedContextRealityBundle(input: {
  readonly contextEventId: string;
  readonly sdkKind: WorkspaceSdkKind;
  readonly focusSlotId: string;
}): ContextRealityBundle {
  const contextEventId = input.contextEventId.trim();
  const focusSlotId = input.focusSlotId.trim();
  const composition = composeRealityForSdkKind(input.sdkKind);
  const bundle: ContextRealityBundle = {
    version: CONTEXT_REALITY_BUNDLE_VERSION,
    contextEventId,
    composition,
    revealedSlotIds: focusSlotId ? [focusSlotId] : [],
    focusSlotId,
    updatedAtIso: new Date().toISOString(),
  };
  writeContextRealityBundle(bundle);
  return bundle;
}

export function advanceContextRealityFocus(input: {
  readonly contextEventId: string;
  readonly completedSlotId: string;
  readonly nextSlotId: string | null;
}): ContextRealityBundle | null {
  const prev = readContextRealityBundle(input.contextEventId);
  if (!prev) {
    return null;
  }
  const nextFocus = input.nextSlotId?.trim() || prev.focusSlotId;
  const revealedSlotIds = revealFocusSlot({
    revealedSlotIds: prev.revealedSlotIds,
    completedSlotId: input.completedSlotId,
    nextSlotId: nextFocus,
  });
  const bundle: ContextRealityBundle = {
    ...prev,
    revealedSlotIds,
    focusSlotId: nextFocus,
    updatedAtIso: new Date().toISOString(),
  };
  writeContextRealityBundle(bundle);
  return bundle;
}

export function projectionFromBundle(
  bundle: ContextRealityBundle,
): RealityProjection {
  return projectRealityComposition({
    composition: bundle.composition,
    revealedSlotIds: bundle.revealedSlotIds,
    focusSlotId: bundle.focusSlotId,
  });
}

export type RealityPrimitiveStripRow = {
  readonly id: RealityPrimitiveId;
  readonly labelKo: string;
  readonly state: "active" | "latent";
};

/** Host strip — active vs not-yet-revealed primitives (Progressive Morphology). */
export function listRealityPrimitiveStrip(
  bundle: ContextRealityBundle,
): readonly RealityPrimitiveStripRow[] {
  const projection = projectionFromBundle(bundle);
  const active = new Set(projection.activePrimitives);
  return bundle.composition.primitives.map((id) => ({
    id,
    labelKo: realityPrimitiveDef(id).labelKo,
    state: active.has(id) ? ("active" as const) : ("latent" as const),
  }));
}

