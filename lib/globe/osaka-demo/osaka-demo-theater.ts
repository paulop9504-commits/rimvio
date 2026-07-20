/**
 * Osaka 30s demo theater — UI-only state (prep · pulse · isolation · controls).
 * Does not mutate Reality; runner writes snapshots for Globe presentation.
 */

import type { Osaka30sDemoStepId } from "@/lib/globe/osaka-demo/osaka-30s-demo-steps";

export type OsakaDemoPrepCardV1 = {
  readonly version: 1;
  readonly lodgingLabelKo: string;
  readonly eateryLabelKo: string;
  readonly reserveAtLabelKo: string;
};

export type OsakaDemoTheaterState = {
  readonly active: boolean;
  readonly contextEventId: string | null;
  readonly stepId: Osaka30sDemoStepId | null;
  readonly stepIndex: number;
  readonly prepCard: OsakaDemoPrepCardV1 | null;
  readonly commitPulseLabelKo: string | null;
  readonly awaitingApprove: boolean;
  readonly canRewind: boolean;
  /** Show compare arcs on globe. */
  readonly showCompareArcs: boolean;
};

const EVENT_NAME = "rimvio:osaka-demo-theater";

let state: OsakaDemoTheaterState = {
  active: false,
  contextEventId: null,
  stepId: null,
  stepIndex: -1,
  prepCard: null,
  commitPulseLabelKo: null,
  awaitingApprove: false,
  canRewind: false,
  showCompareArcs: false,
};

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function readOsakaDemoTheaterState(): OsakaDemoTheaterState {
  return state;
}

export function isOsakaDemoTheaterActive(): boolean {
  return state.active;
}

export function writeOsakaDemoTheaterState(
  next: Partial<OsakaDemoTheaterState>,
): void {
  state = { ...state, ...next };
  emit();
}

export function resetOsakaDemoTheaterState(): void {
  state = {
    active: false,
    contextEventId: null,
    stepId: null,
    stepIndex: -1,
    prepCard: null,
    commitPulseLabelKo: null,
    awaitingApprove: false,
    canRewind: false,
    showCompareArcs: false,
  };
  emit();
}

export function subscribeOsakaDemoTheater(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
