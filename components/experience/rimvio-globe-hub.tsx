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
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useRelationshipFeedSlots } from "@/hooks/use-relationship-feed-slots";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { buildFeedSlotPeerLookup } from "@/lib/feed/build-feed-slot-peer-lookup";
import { enrichClassifiedGlobePinPeers } from "@/lib/globe/project-globe-pin-peers";
import { ensureGlobeDemoEvents } from "@/lib/experience-graph/seed-globe-demo-events";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import {
  findPinClusterByEventId,
  findPinClusterByPinId,
  projectPinClusterClassifiedPins,
  projectPinClustersFromGraph,
} from "@/lib/globe/project-pin-clusters";
import { projectTripLegArcs } from "@/lib/globe/project-trip-leg-arcs";
import {
  GLOBE_EXPERIENCE_SETTINGS_UPDATED,
  isShowTripArcsEnabled,
} from "@/lib/globe/globe-experience-settings";
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
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, refresh);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, refresh);
    };
  }, []);

  return { ready, eventsById };
}

export type RimvioGlobeHubHandle = {
  flyToPin: RimvioGlobe3DHandle["flyToPin"];
  resetToOverview: () => void;
  getPointOfView: RimvioGlobe3DHandle["getPointOfView"];
  getScreenCoords: RimvioGlobe3DHandle["getScreenCoords"];
};

export type RimvioGlobeHubProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobeHubHandle>;
  initialOpenPinId?: string | null;
  initialRecallEventId?: string | null;
  /** Highlight pin card while pin sheet is open — does not lock zoom. */
  highlightedPinId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
  pinRelocateEnabled?: boolean;
  onPinRelocate?: (input: {
    pinId: string;
    sourceEventId: string;
    lat: number;
    lng: number;
  }) => void;
};

type RimvioGlobeHubBodyProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobeHubHandle>;
  clusters: readonly PinCluster[];
  eventsById: ReadonlyMap<string, EventCandidate>;
  initialOpenPinId?: string | null;
  highlightedPinId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
  pinRelocateEnabled?: boolean;
  onPinRelocate?: (input: {
    pinId: string;
    sourceEventId: string;
    lat: number;
    lng: number;
  }) => void;
};

const RimvioGlobeHubBody = memo(
  forwardRef<RimvioGlobeHubHandle, RimvioGlobeHubBodyProps>(function RimvioGlobeHubBody(
    {
      className,
      clusters,
      eventsById,
      initialOpenPinId,
      highlightedPinId,
      onPinPress,
      pinRelocateEnabled = false,
      onPinRelocate,
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
    const [tripArcsEnabled, setTripArcsEnabled] = useState(() => isShowTripArcsEnabled());
    useEffect(() => {
      const sync = () => setTripArcsEnabled(isShowTripArcsEnabled());
      sync();
      window.addEventListener(GLOBE_EXPERIENCE_SETTINGS_UPDATED, sync);
      return () => window.removeEventListener(GLOBE_EXPERIENCE_SETTINGS_UPDATED, sync);
    }, []);
    const tripArcs = useMemo(
      () =>
        tripArcsEnabled
          ? projectTripLegArcs({ eventsById, clusters })
          : [],
      [eventsById, clusters, tripArcsEnabled],
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
    const displayPinId =
      highlightedPinId !== undefined ? highlightedPinId : activePinId;

    useImperativeHandle(ref, () => ({
      flyToPin(lat, lng, level) {
        innerGlobeRef.current?.flyToPin(lat, lng, level);
      },
      resetToOverview() {
        innerGlobeRef.current?.resetOverview();
      },
      getPointOfView() {
        return innerGlobeRef.current?.getPointOfView() ?? null;
      },
      getScreenCoords(lat, lng) {
        return innerGlobeRef.current?.getScreenCoords(lat, lng) ?? null;
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

    return (
      <div
        className={cn("relative flex h-full min-h-0 flex-1 flex-col", className)}
        data-rimvio-globe-hub
        data-rimvio-globe-surface="globe3d"
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
          activePinId={displayPinId}
          className="h-full flex-1"
          onPinPress={handlePinPress}
          pinRelocateEnabled={pinRelocateEnabled}
          onPinRelocate={onPinRelocate}
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

/** Globe-first home — 3D earth only, pins on top. */
export const RimvioGlobeHub = memo(function RimvioGlobeHub({
  className,
  globeRef,
  initialOpenPinId,
  initialRecallEventId,
  highlightedPinId,
  onPinPress,
  pinRelocateEnabled,
  onPinRelocate,
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
      highlightedPinId={highlightedPinId}
      onPinPress={onPinPress}
      pinRelocateEnabled={pinRelocateEnabled}
      onPinRelocate={onPinRelocate}
    />
  );
});
