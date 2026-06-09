"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { RimvioGlobe3DClient } from "@/components/experience/rimvio-globe-3d-client";
import type { RimvioGlobe3DHandle } from "@/components/experience/rimvio-globe-3d";
import { GlobeFlatMapStage } from "@/components/globe/globe-flat-map-stage";
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useRelationshipFeedSlots } from "@/hooks/use-relationship-feed-slots";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { buildFeedSlotPeerLookup } from "@/lib/feed/build-feed-slot-peer-lookup";
import {
  flatMapZoomFromGlobeAltitude,
  shouldExitFlatMapToGlobe3d,
  type FlatMapView,
} from "@/lib/globe/flat-map-view";
import { enrichClassifiedGlobePinPeers } from "@/lib/globe/project-globe-pin-peers";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import {
  resolveGlobeSurfaceMode,
  type GlobeSurfaceMode,
} from "@/lib/globe/resolve-globe-surface-mode";
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
import { projectTripLegArcs } from "@/lib/globe/project-trip-leg-arcs";
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

export type RimvioGlobeHubHandle = {
  flyToPin: RimvioGlobe3DHandle["flyToPin"];
  resetToOverview: () => void;
};

export type RimvioGlobeHubProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobeHubHandle>;
  initialOpenPinId?: string | null;
  initialRecallEventId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
};

type RimvioGlobeHubBodyProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobeHubHandle>;
  clusters: readonly PinCluster[];
  eventsById: ReadonlyMap<string, EventCandidate>;
  initialOpenPinId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
};

const DEFAULT_FLAT_VIEW: FlatMapView = {
  lat: 36.35,
  lng: 127.3,
  zoom: 2.4,
};

const RimvioGlobeHubBody = memo(
  forwardRef<RimvioGlobeHubHandle, RimvioGlobeHubBodyProps>(function RimvioGlobeHubBody(
    {
      className,
      clusters,
      eventsById,
      initialOpenPinId,
      onPinPress,
    },
    ref,
  ) {
    const innerGlobeRef = useRef<RimvioGlobe3DHandle>(null);
    const { slots: relationshipSlots } = useRelationshipFeedSlots(true);
    const peerLookup = useMemo(
      () =>
        buildFeedSlotPeerLookup({
          messages: [],
          relationshipSlots,
          contacts: readPeerContacts(),
        }),
      [relationshipSlots],
    );
    const classifiedPins = useMemo(
      () =>
        enrichClassifiedGlobePinPeers(
          projectPinClusterClassifiedPins(clusters, eventsById),
          eventsById,
          peerLookup,
        ),
      [clusters, eventsById, peerLookup],
    );
    const tripArcs = useMemo(
      () => projectTripLegArcs({ eventsById, clusters }),
      [eventsById, clusters],
    );
    const { enabled: gpsEnabled } = useGpsTrackingEnabled();
    const liveLocation = useLiveLocationSnapshot();
    const globePins = useMemo(() => {
      const pins: ClassifiedGlobePin[] = [...classifiedPins];
      if (gpsEnabled && liveLocation) {
        pins.push({
          id: "viewer:here",
          kind: "gps",
          label: "현재 위치",
          lat: liveLocation.lat,
          lng: liveLocation.lng,
          pinX: 0,
          pinY: 0,
          pinShape: "viewer",
          emphasis: "primary",
        });
      }
      return pins;
    }, [classifiedPins, gpsEnabled, liveLocation]);
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const [surfaceMode, setSurfaceMode] = useState<GlobeSurfaceMode>("globe3d");
    const [flatView, setFlatView] = useState<FlatMapView>(DEFAULT_FLAT_VIEW);

    useImperativeHandle(ref, () => ({
      flyToPin(lat, lng, level) {
        innerGlobeRef.current?.flyToPin(lat, lng, level);
      },
      resetToOverview() {
        setSurfaceMode("globe3d");
        innerGlobeRef.current?.resetOverview();
      },
    }));

    useEffect(() => {
      const seed = initialOpenPinId?.trim();
      if (seed) {
        setActivePinId(seed);
      }
    }, [initialOpenPinId]);

    const handlePinPress = useCallback(
      (pinId: string) => {
        if (pinId === "viewer:here") {
          return;
        }
        setActivePinId(pinId);
        const cluster = findPinClusterByPinId(clusters, pinId);
        if (cluster) {
          onPinPress?.(cluster);
        }
      },
      [clusters, onPinPress],
    );

    const handlePointOfViewChange = useCallback(
      (pov: {
        lat: number;
        lng: number;
        altitude: number;
        detailLevel: GlobeDetailLevel;
      }) => {
        setSurfaceMode((current) => {
          const next = resolveGlobeSurfaceMode(current, {
            altitude: pov.altitude,
            detailLevel: pov.detailLevel,
          });
          if (next === "flat2d") {
            setFlatView({
              lat: pov.lat,
              lng: pov.lng,
              zoom: flatMapZoomFromGlobeAltitude(pov.altitude),
            });
          }
          return next;
        });
      },
      [],
    );

    const handleFlatViewChange = useCallback((next: FlatMapView) => {
      setFlatView(next);
      if (shouldExitFlatMapToGlobe3d(next.zoom)) {
        setSurfaceMode("globe3d");
        innerGlobeRef.current?.flyToPin(next.lat, next.lng, "city");
      }
    }, []);

    return (
      <div
        className={cn("relative flex h-full min-h-0 flex-1 flex-col", className)}
        data-rimvio-globe-hub
        data-rimvio-globe-surface={surfaceMode}
      >
        <div
          className={cn(
            "relative h-full flex-1",
            surfaceMode === "flat2d" && "pointer-events-none invisible",
          )}
          aria-hidden={surfaceMode === "flat2d"}
        >
          <RimvioGlobe3DClient
            ref={innerGlobeRef}
            pins={globePins}
            tripArcs={tripArcs}
            viewerLocation={
              gpsEnabled && liveLocation
                ? {
                    lat: liveLocation.lat,
                    lng: liveLocation.lng,
                    accuracyM: liveLocation.accuracyM,
                  }
                : null
            }
            activePinId={activePinId}
            className="h-full flex-1"
            onPinPress={handlePinPress}
            onPointOfViewChange={handlePointOfViewChange}
          />
        </div>

        <GlobeFlatMapStage
          view={flatView}
          onViewChange={handleFlatViewChange}
          pins={globePins}
          activePinId={activePinId}
          onPinPress={handlePinPress}
          viewerLocation={
            gpsEnabled && liveLocation
              ? {
                  lat: liveLocation.lat,
                  lng: liveLocation.lng,
                  accuracyM: liveLocation.accuracyM,
                }
              : null
          }
          active={surfaceMode === "flat2d"}
          className={cn(
            "z-[5]",
            surfaceMode === "flat2d"
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        />

        {clusters.length === 0 ? (
          <p
            className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-10 mx-auto w-fit max-w-[85%] rounded-full bg-white/90 px-3.5 py-1.5 text-center text-[12px] font-medium text-[#8b95a1] shadow-sm backdrop-blur-md"
            data-rimvio-globe-hub-empty
          >
            기록이 쌓이면 지구에 핀이 나타납니다.
          </p>
        ) : null}
      </div>
    );
  }),
);

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
          "rimvio-globe-space rimvio-globe-space--toss flex min-h-[60vh] flex-1 items-center justify-center px-6 text-center text-[14px] text-[#8b95a1]",
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
      ref={globeRef}
      className={className}
      clusters={clusters}
      eventsById={eventsById}
      initialOpenPinId={initialOpenPinId}
      onPinPress={onPinPress}
    />
  );
});
