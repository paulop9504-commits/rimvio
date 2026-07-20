"use client";

import { useEffect, useMemo, useState } from "react";
import type { Osaka30sDemoStepId } from "@/lib/globe/osaka-demo/osaka-30s-demo-steps";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

const STEP_ORDER: readonly Osaka30sDemoStepId[] = [
  "trip",
  "pin_apa",
  "nearby_food",
  "local_filter",
  "first_reserve",
  "approve",
];

function stepRank(stepId: Osaka30sDemoStepId | null): number {
  if (!stepId) {
    return -1;
  }
  const index = STEP_ORDER.indexOf(stepId);
  return index >= 0 ? index : -1;
}

function familyRank(family: BrainSurfaceProjectionCandidate["family"]): number {
  if (family === "lodging") {
    return 0;
  }
  if (family === "eatery") {
    return 1;
  }
  return 2;
}

export function useOsakaDemoMarkerReveal(input: {
  active: boolean;
  stepId: Osaka30sDemoStepId | null;
  stepStatus:
    | "pending"
    | "running"
    | "done"
    | "awaiting_approve"
    | "error"
    | null;
  markers: readonly BrainSurfaceProjectionCandidate[];
}) {
  const [visibleIds, setVisibleIds] = useState<ReadonlySet<string>>(new Set());
  const [popDelays, setPopDelays] = useState<ReadonlyMap<string, number>>(
    new Map(),
  );

  useEffect(() => {
    if (!input.active) {
      setVisibleIds(new Set());
      setPopDelays(new Map());
      return;
    }

    const rank = stepRank(input.stepId);
    if (rank < 0) {
      return;
    }

    const eligible = input.markers.filter((marker) => {
      if (rank === 0) {
        return false;
      }
      if (rank === 1) {
        return marker.family === "lodging";
      }
      return true;
    });

    if (eligible.length === 0) {
      setVisibleIds(new Set());
      setPopDelays(new Map());
      return;
    }

    // Keep pins stable while waiting for human approve — show all immediately.
    if (input.stepStatus === "awaiting_approve") {
      const all = new Set(eligible.map((marker) => marker.id));
      const delays = new Map<string, number>();
      for (const marker of eligible) {
        delays.set(marker.id, 0);
      }
      setVisibleIds(all);
      setPopDelays(delays);
      return;
    }

    const sorted = [...eligible].sort((left, right) => {
      const family = familyRank(left.family) - familyRank(right.family);
      if (family !== 0) {
        return family;
      }
      return left.revealOrder - right.revealOrder;
    });

    const nextDelays = new Map<string, number>();
    const timers: number[] = [];
    const nextVisible = new Set<string>();

    setVisibleIds(new Set());
    setPopDelays(new Map());

    const baseDelay = input.stepStatus === "running" ? 80 : 0;
    const staggerMs = rank <= 1 ? 140 : rank === 2 ? 90 : 40;

    for (let index = 0; index < sorted.length; index += 1) {
      const marker = sorted[index]!;
      const delay = baseDelay + index * staggerMs;
      nextDelays.set(marker.id, delay);
      const timer = window.setTimeout(() => {
        nextVisible.add(marker.id);
        setVisibleIds(new Set(nextVisible));
        setPopDelays(new Map(nextDelays));
      }, delay);
      timers.push(timer);
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [input.active, input.markers, input.stepId, input.stepStatus]);

  const revealedMarkers = useMemo(() => {
    if (!input.active || visibleIds.size === 0) {
      return [] as BrainSurfaceProjectionCandidate[];
    }
    return input.markers
      .filter((marker) => visibleIds.has(marker.id))
      .map((marker) => ({
        ...marker,
        revealOrder: popDelays.get(marker.id) ?? marker.revealOrder,
      }));
  }, [input.active, input.markers, popDelays, visibleIds]);

  return { revealedMarkers };
}
