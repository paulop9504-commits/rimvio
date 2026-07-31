"use client";

/**
 * Globe 3D Brief Replay — same event as Workspace MapLibre.
 * Runs only when Workspace is collapsed (2D map not owning the tour).
 */

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import {
  dispatchWorkspaceBriefReplayStep,
  subscribeWorkspaceBriefReplay,
} from "@/lib/context-workspace/context-brief/brief-replay-bridge";
import { buildBriefReplayStops } from "@/lib/context-workspace/context-brief/build-brief-replay-stops";
import { runWorkspaceBriefReplay } from "@/lib/context-workspace/context-brief/run-workspace-brief-replay";
import {
  readContextWorkspace,
  readContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";

const GLOBE_REPLAY_STEP_MS = 1600;
const GLOBE_REPLAY_LEVEL = "neighborhood" as const;

export function useGlobeBriefReplay(input: {
  readonly globeRef: RefObject<RimvioGlobeHubHandle | null>;
}): void {
  const globeRef = input.globeRef;
  const cancelRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    return subscribeWorkspaceBriefReplay((detail) => {
      const ctx = detail.contextEventId.trim();
      if (!ctx) return;
      // Workspace MapLibre owns replay while expanded.
      if (readContextWorkspaceExpanded(ctx)) return;

      const state = readContextWorkspace(ctx);
      if (!state) return;

      const stops = buildBriefReplayStops(state, detail.nodeIds);
      if (stops.length === 0) return;

      cancelRef.current = true;
      runningRef.current = false;
      // Allow prior loop to observe cancel, then start fresh.
      window.setTimeout(() => {
        cancelRef.current = false;
        runningRef.current = true;
        void runWorkspaceBriefReplay({
          stops,
          stepMs: GLOBE_REPLAY_STEP_MS,
          shouldCancel: () => cancelRef.current,
          onStep: (stepIndex, stop) => {
            dispatchWorkspaceBriefReplayStep({
              contextEventId: ctx,
              stepIndex,
              total: stops.length,
              nodeId: stop.id,
              done: false,
            });
          },
          flyTo: (stop) => {
            globeRef.current?.flyToPin(
              stop.lat,
              stop.lng,
              GLOBE_REPLAY_LEVEL,
              { pinViewportY: 0.58 },
            );
          },
          onDone: () => {
            runningRef.current = false;
            dispatchWorkspaceBriefReplayStep({
              contextEventId: ctx,
              stepIndex: Math.max(0, stops.length - 1),
              total: stops.length,
              nodeId: stops[stops.length - 1]?.id ?? null,
              done: true,
            });
          },
        });
      }, 0);
    });
  }, [globeRef]);
}
