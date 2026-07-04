"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BrainSurfaceProjectionBatch,
  BrainSurfaceProjectionCandidate,
} from "@/lib/situation-projection/brain-surface-types";

export type BrainSurfaceProjectionRevealState = {
  eventId: string | null;
  visibleCandidateIds: ReadonlySet<string>;
  popInDelays: ReadonlyMap<string, number>;
};

const EMPTY: BrainSurfaceProjectionRevealState = {
  eventId: null,
  visibleCandidateIds: new Set(),
  popInDelays: new Map(),
};

export function useBrainSurfaceProjectionReveal(input: {
  focusedEventId: string | null | undefined;
  batch: BrainSurfaceProjectionBatch | null;
  launchToken: number;
}) {
  const [state, setState] = useState<BrainSurfaceProjectionRevealState>(EMPTY);

  useEffect(() => {
    const eventId = input.focusedEventId?.trim() ?? null;
    const batch = input.batch;
    if (!eventId || !batch || batch.eventId !== eventId || input.launchToken <= 0) {
      setState(EMPTY);
      return;
    }

    const visibleCandidateIds = new Set<string>();
    const popInDelays = new Map<string, number>();
    const timers: number[] = [];

    setState({ eventId, visibleCandidateIds: new Set(), popInDelays });

    for (const candidate of batch.candidates) {
      const delay = candidate.revealOrder * 180;
      popInDelays.set(candidate.id, delay);
      const timer = window.setTimeout(() => {
        visibleCandidateIds.add(candidate.id);
        setState({
          eventId,
          visibleCandidateIds: new Set(visibleCandidateIds),
          popInDelays: new Map(popInDelays),
        });
      }, delay);
      timers.push(timer);
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [input.batch, input.focusedEventId, input.launchToken]);

  const visibleCandidates = useMemo(() => {
    const batch = input.batch;
    if (!batch || state.eventId !== batch.eventId || state.visibleCandidateIds.size === 0) {
      return [] as BrainSurfaceProjectionCandidate[];
    }
    return batch.candidates
      .filter((candidate) => state.visibleCandidateIds.has(candidate.id))
      .map((candidate) => ({
        ...candidate,
        revealOrder: state.popInDelays.get(candidate.id) ?? candidate.revealOrder,
      }));
  }, [input.batch, state]);

  return {
    state,
    visibleCandidates,
  };
}
