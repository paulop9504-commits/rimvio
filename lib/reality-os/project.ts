/**
 * Projection — Workspace Node is a lens on Reality composition, not SSOT.
 * Progressive: only revealed Focus slots / active primitives drive Node feel.
 * @see docs/adr/034-reality-os-primitives-projection.md
 */

import type { RealityComposition } from "@/lib/reality-os/compose";
import {
  REALITY_PRIMITIVE_DEFS,
  type RealityPrimitiveId,
} from "@/lib/reality-os/primitives";
import {
  morphologyDef,
  type WorkspaceMorphologyId,
} from "@/lib/workspace-morphology";
import type { WorkspaceSdkNodeSurface } from "@/lib/workspace-sdk/types";

/** Slot id → which primitive it primarily belongs to (live kinds). */
const SLOT_PRIMITIVE: Readonly<Record<string, RealityPrimitiveId>> = {
  flight: "spatial",
  hotel: "transaction",
  itinerary: "timeline",
  map: "spatial",
  budget: "ledger",
  eatery: "recommendation",
  photos: "object",
  product: "object",
  price: "transaction",
  location: "spatial",
  match: "pipeline",
  conditions: "object",
  sellers: "pipeline",
  chat: "communication",
  status: "pipeline",
  here: "spatial",
  demand_hot: "dashboard",
  home_route: "spatial",
  call_density: "dashboard",
};

export type RealityProjection = {
  readonly morphologyId: WorkspaceMorphologyId;
  readonly nodeSurface: WorkspaceSdkNodeSurface;
  readonly nodeLabelKo: string;
  /** Primitives that already have at least one revealed slot. */
  readonly activePrimitives: readonly RealityPrimitiveId[];
  /** Still in composition but not yet revealed. */
  readonly latentPrimitives: readonly RealityPrimitiveId[];
  readonly progressiveHintKo: string;
};

function surfaceForMorphology(
  morphologyId: WorkspaceMorphologyId,
): WorkspaceSdkNodeSurface {
  const hint = morphologyDef(morphologyId).nodeSurfaceHint;
  if (hint === "canvas") {
    return "canvas";
  }
  return hint;
}

/**
 * Project composition + revealed slots → Node projection for SDK Host.
 * Morphology locks the familiar Node shell; active primitive drives label/hint.
 */
export function projectRealityComposition(input: {
  readonly composition: RealityComposition;
  readonly revealedSlotIds: readonly string[];
  readonly focusSlotId?: string | null;
}): RealityProjection {
  const revealed = new Set(
    input.revealedSlotIds.map((id) => id.trim()).filter(Boolean),
  );
  const focus = input.focusSlotId?.trim() || null;

  const activeSet = new Set<RealityPrimitiveId>();
  for (const slotId of revealed) {
    const p = SLOT_PRIMITIVE[slotId];
    if (p && input.composition.primitives.includes(p)) {
      activeSet.add(p);
    }
  }
  if (focus) {
    const p = SLOT_PRIMITIVE[focus];
    if (p && input.composition.primitives.includes(p)) {
      activeSet.add(p);
    }
  }

  if (activeSet.size === 0 && input.composition.primitives[0]) {
    activeSet.add(input.composition.primitives[0]);
  }

  const activePrimitives = input.composition.primitives.filter((p) =>
    activeSet.has(p),
  );
  const latentPrimitives = input.composition.primitives.filter(
    (p) => !activeSet.has(p),
  );

  const dominant =
    (focus && SLOT_PRIMITIVE[focus]) ||
    activePrimitives[0] ||
    input.composition.primitives[0];

  // Familiar shell from morphology (pipeline / map / dashboard…);
  // travel hotel Focus may lean cards for candidate picks.
  let nodeSurface = surfaceForMorphology(input.composition.defaultMorphologyId);
  if (
    input.composition.defaultMorphologyId === "spatial_timeline" &&
    focus === "hotel"
  ) {
    nodeSurface = "cards";
  } else if (
    input.composition.defaultMorphologyId === "spatial_timeline" &&
    dominant === "timeline"
  ) {
    nodeSurface = "timeline";
  }

  const nodeLabelKo = dominant
    ? REALITY_PRIMITIVE_DEFS[dominant].labelKo
    : morphologyDef(input.composition.defaultMorphologyId).labelKo;

  const latentLabels = latentPrimitives
    .slice(0, 2)
    .map((p) => REALITY_PRIMITIVE_DEFS[p].labelKo);

  const progressiveHintKo =
    latentLabels.length > 0
      ? `지금은 ${nodeLabelKo} · 다음에 ${latentLabels.join(" · ")}`
      : `지금은 ${nodeLabelKo}`;

  return {
    morphologyId: input.composition.defaultMorphologyId,
    nodeSurface,
    nodeLabelKo,
    activePrimitives,
    latentPrimitives,
    progressiveHintKo,
  };
}

/**
 * After completing a Focus slot — reveal that slot (and keep prior reveals).
 */
export function revealFocusSlot(input: {
  readonly revealedSlotIds: readonly string[];
  readonly completedSlotId: string;
  readonly nextSlotId?: string | null;
}): readonly string[] {
  const next = new Set(
    input.revealedSlotIds.map((id) => id.trim()).filter(Boolean),
  );
  const completed = input.completedSlotId.trim();
  if (completed) {
    next.add(completed);
  }
  const upcoming = input.nextSlotId?.trim();
  if (upcoming) {
    next.add(upcoming);
  }
  return [...next];
}

export function primitiveForSlot(
  slotId: string,
): RealityPrimitiveId | null {
  return SLOT_PRIMITIVE[slotId.trim()] ?? null;
}

