import type { ComposerDecisionPhase } from "@/lib/context-run/execution-decision";
import {
  resolvePrimarySurface,
  type SurfaceEffectKind,
} from "@/lib/context-run/surface-resolver";
import type { ContextRunSurfaceResolution } from "@/lib/context-run/types";

export type ComposerSurfaceEffect =
  | { type: "none" }
  | { type: "open_portal"; eventId: string | null; composeText: string }
  | { type: "field_discovery" }
  | { type: "map_focus"; eventId: string };

export type GlobeComposerSurfaceResolution = ContextRunSurfaceResolution & {
  effect: ComposerSurfaceEffect;
};

/** Deterministic, client-safe graph id for composer runs. */
export function buildComposerGraphId(
  eventId: string | null | undefined,
  seed: string,
): string {
  const key = `${eventId?.trim() || "new"}:${seed.trim()}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const digest = (hash >>> 0).toString(16).padStart(8, "0");
  return `composer:${digest}`;
}

/** Globe composer submit → Decision + primary Surface (G2, G3, G8). */
export function resolveGlobeComposerSurface(input: {
  phase: ComposerDecisionPhase;
  eventId?: string | null;
  composeText?: string;
}): GlobeComposerSurfaceResolution {
  const composeText = input.composeText?.trim() ?? "";
  const eventId = input.eventId?.trim() || null;
  const graphId = buildComposerGraphId(eventId, `${input.phase}:${composeText}`);

  const resolved = resolvePrimarySurface({
    graphId,
    composerPhase: input.phase,
  });

  return {
    graphId: resolved.graphId,
    decision: resolved.decision,
    surface: resolved.surface,
    reason: resolved.reason,
    effect: mapComposerEffect(resolved.effect, eventId, composeText),
  };
}

function mapComposerEffect(
  effect: SurfaceEffectKind,
  eventId: string | null,
  composeText: string,
): ComposerSurfaceEffect {
  switch (effect) {
    case "open_portal":
      return { type: "open_portal", eventId, composeText };
    case "open_field_discovery":
      return { type: "field_discovery" };
    case "map_focus":
      return eventId ? { type: "map_focus", eventId } : { type: "none" };
    default:
      return { type: "none" };
  }
}
