import type { BrainSurfaceDisclosureStage } from "@/lib/globe/brain-surface-progressive-disclosure";

/** Three Floors — Replay → Context → Action (docs/RIMVIO_THREE_FLOORS.md). */
export type GlobeThreeFloorsStage = "replay" | "context" | "action";

/** UX constitution surface — condition vs execution. */
export type RimvioUxSurfaceMode = "globe" | "field";

export function resolveGlobeThreeFloorsStage(input: {
  showMapVideoReplay?: boolean;
  brainSurfaceVisible?: boolean;
  brainSurfaceDisclosureStage?: BrainSurfaceDisclosureStage;
  showOntologyPeek?: boolean;
  fieldExecutionOpen?: boolean;
}): GlobeThreeFloorsStage {
  if (input.fieldExecutionOpen) {
    return "action";
  }
  if (input.brainSurfaceDisclosureStage === "detail") {
    return "action";
  }
  if (input.showOntologyPeek) {
    return "context";
  }
  if (input.showMapVideoReplay) {
    return "replay";
  }
  if (input.brainSurfaceVisible) {
    return "replay";
  }
  return "replay";
}

export function resolveRimvioUxSurfaceMode(input: {
  fieldExecutionOpen?: boolean;
}): RimvioUxSurfaceMode {
  return input.fieldExecutionOpen ? "field" : "globe";
}

export function shouldSuppressGlobePriorityChrome(input: {
  showMapVideoReplay?: boolean;
  showOntologyPeek?: boolean;
  brainSurfaceVisible?: boolean;
  fieldExecutionOpen?: boolean;
}): boolean {
  return Boolean(
    input.showMapVideoReplay ||
      input.showOntologyPeek ||
      input.brainSurfaceVisible ||
      input.fieldExecutionOpen,
  );
}
