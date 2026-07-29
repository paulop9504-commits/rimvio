/**
 * Map product verbs → Reality residue layer (ADR-037).
 * Observation is never a durable workstream event.
 */

import type { RealityResidueLayer } from "@/lib/workstream/types";
import { isEphemeralWorkUtterance } from "@/lib/workstream/is-ephemeral-work";

export function resolveRealityResidueLayer(input: {
  readonly utterance?: string | null;
  readonly selected?: boolean;
  readonly realityCommitted?: boolean;
}): RealityResidueLayer {
  if (input.realityCommitted === true) {
    return "commit";
  }
  if (input.selected === true) {
    return "selection";
  }
  const text = input.utterance?.trim() ?? "";
  if (text && isEphemeralWorkUtterance(text)) {
    return "observation";
  }
  if (text) {
    return "selection";
  }
  return "observation";
}

/** “봤다” ≠ “결정” — Observation must not promote to Confirmed. */
export function observationIsNotDecision(layer: RealityResidueLayer): boolean {
  return layer === "observation";
}
