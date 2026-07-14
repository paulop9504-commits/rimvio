/**
 * Lightweight sequencer progress trail — Hub / compose can read.
 */

import type { RimvioEngineId } from "@/lib/engine/engine-types";

export const CONTEXT_PLAN_SEQUENCER_PROGRESS_META_KEY =
  "contextPlanSequencerProgressV1" as const;

export type PlanSequencerProgressPhase =
  | "auto_scout"
  | "ingress_domain"
  | "scout_retry"
  | "blocked_retry";

export type PlanSequencerProgressWire = {
  readonly atIso: string;
  readonly engineId: RimvioEngineId | null;
  readonly phase: PlanSequencerProgressPhase;
  readonly detailKo: string;
};

const memory = new Map<string, PlanSequencerProgressWire>();

export function recordPlanSequencerProgress(input: {
  contextEventId: string;
  engineId?: RimvioEngineId | null;
  phase: PlanSequencerProgressPhase;
  detailKo: string;
}): PlanSequencerProgressWire {
  const wire: PlanSequencerProgressWire = {
    atIso: new Date().toISOString(),
    engineId: input.engineId ?? null,
    phase: input.phase,
    detailKo: input.detailKo.trim(),
  };
  const id = input.contextEventId.trim();
  if (id) {
    memory.set(id, wire);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("rimvio:plan-sequencer-progress", {
          detail: { contextEventId: id, wire },
        }),
      );
    }
  }
  return wire;
}

export function readPlanSequencerProgress(
  contextEventId: string,
): PlanSequencerProgressWire | null {
  return memory.get(contextEventId.trim()) ?? null;
}

export function subscribePlanSequencerProgress(
  listener: (contextEventId: string, wire: PlanSequencerProgressWire) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (
      event as CustomEvent<{
        contextEventId: string;
        wire: PlanSequencerProgressWire;
      }>
    ).detail;
    if (detail?.contextEventId && detail.wire) {
      listener(detail.contextEventId, detail.wire);
    }
  };
  window.addEventListener("rimvio:plan-sequencer-progress", handler);
  return () =>
    window.removeEventListener("rimvio:plan-sequencer-progress", handler);
}
