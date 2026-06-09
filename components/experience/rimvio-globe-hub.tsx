"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { RimvioGlobe3DClient } from "@/components/experience/rimvio-globe-3d-client";
import type { RimvioGlobe3DHandle } from "@/components/experience/rimvio-globe-3d";
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import { ensureGlobeDemoEvents } from "@/lib/experience-graph/seed-globe-demo-events";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import {
  findPinClusterByEventId,
  findPinClusterByPinId,
  projectPinClusterClassifiedPins,
  projectPinClustersFromGraph,
} from "@/lib/globe/project-pin-clusters";
import { cn } from "@/lib/utils";

function useGlobeEventSnapshot() {
  const [ready, setReady] = useState(false);
  const [eventsById, setEventsById] = useState<ReadonlyMap<string, EventCandidate>>(
    () => new Map<string, EventCandidate>(),
  );

  useEffect(() => {
    ensureGlobeDemoEvents();
    const refresh = () => {
      setEventsById(indexEventsById(listLifeEventCandidates()));
      setReady(true);
    };
    refresh();
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);
  }, []);

  return { ready, eventsById };
}

export type RimvioGlobeHubProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobe3DHandle>;
  initialOpenPinId?: string | null;
  initialRecallEventId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
};

type RimvioGlobeHubBodyProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobe3DHandle>;
  clusters: readonly PinCluster[];
  initialOpenPinId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
};

const RimvioGlobeHubBody = memo(function RimvioGlobeHubBody({
  className,
  globeRef,
  clusters,
  initialOpenPinId,
  onPinPress,
}: RimvioGlobeHubBodyProps) {
  const classifiedPins = useMemo(
    () => projectPinClusterClassifiedPins(clusters),
    [clusters],
  );
  const [activePinId, setActivePinId] = useState<string | null>(null);

  useEffect(() => {
    const seed = initialOpenPinId?.trim();
    if (seed) {
      setActivePinId(seed);
    }
  }, [initialOpenPinId]);

  const handlePinPress = useCallback(
    (pinId: string) => {
      setActivePinId(pinId);
      const cluster = findPinClusterByPinId(clusters, pinId);
      if (cluster) {
        onPinPress?.(cluster);
      }
    },
    [clusters, onPinPress],
  );

  if (clusters.length === 0) {
    return (
      <div
        className={cn(
          "rimvio-globe-space flex min-h-[60vh] flex-1 items-center justify-center px-6 text-center text-[14px] text-white/55",
          className,
        )}
        data-rimvio-globe-hub-empty
      >
        기록이 쌓이면 지구에 핀이 나타납니다.
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full min-h-0 flex-1 flex-col", className)}
      data-rimvio-globe-hub
    >
      <RimvioGlobe3DClient
        ref={globeRef}
        pins={classifiedPins}
        activePinId={activePinId}
        className="h-full flex-1"
        onPinPress={handlePinPress}
      />
    </div>
  );
});

/** Globe-first home — giant earth, pins only. */
export const RimvioGlobeHub = memo(function RimvioGlobeHub({
  className,
  globeRef,
  initialOpenPinId,
  initialRecallEventId,
  onPinPress,
}: RimvioGlobeHubProps) {
  const { ready, eventsById } = useGlobeEventSnapshot();
  const { graph } = useExperienceGraph(ready ? eventsById : undefined);
  const recallOpenedRef = useRef(false);

  const clusters = useMemo(
    () =>
      ready
        ? projectPinClustersFromGraph({
            volumes: graph.volumes,
            eventsById,
          })
        : [],
    [ready, graph.volumes, eventsById],
  );

  useEffect(() => {
    if (!ready || recallOpenedRef.current || !onPinPress) {
      return;
    }
    const eventId = initialRecallEventId?.trim();
    if (!eventId) {
      return;
    }
    const cluster = findPinClusterByEventId(clusters, eventId);
    if (!cluster) {
      return;
    }
    recallOpenedRef.current = true;
    onPinPress(cluster);
  }, [ready, clusters, initialRecallEventId, onPinPress]);

  if (!ready) {
    return (
      <div
        className={cn(
          "rimvio-globe-space flex min-h-[60vh] flex-1 items-center justify-center px-6 text-center text-[14px] text-white/55",
          className,
        )}
        data-rimvio-globe-hub-loading
      >
        지구 불러오는 중…
      </div>
    );
  }

  return (
    <RimvioGlobeHubBody
      className={className}
      globeRef={globeRef}
      clusters={clusters}
      initialOpenPinId={initialOpenPinId}
      onPinPress={onPinPress}
    />
  );
});
