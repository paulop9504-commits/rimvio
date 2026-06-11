"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { GlobeContextControlDock } from "@/components/globe/globe-context-control-dock";
import { GlobeContextMapVideoStage } from "@/components/globe/globe-context-map-video-stage";
import { GlobeContextIngestBar } from "@/components/globe/globe-context-ingest-bar";
import { GlobeContextListSheet } from "@/components/globe/globe-context-list-sheet";
import { GlobeContextManageSheet } from "@/components/globe/globe-context-manage-sheet";
import { GlobeContextStackPicker } from "@/components/globe/globe-context-stack-picker";
import { GlobeCreateContextSheet } from "@/components/globe/globe-create-context-sheet";
import { ExperienceBridgeInviteBanner } from "@/components/globe/experience-bridge-invite-banner";
import { ExperienceBridgeGhostSheet } from "@/components/globe/experience-bridge-ghost-sheet";
import { GlobeSettingsSheet } from "@/components/globe/globe-settings-sheet";
import { GlobeLocationConfirmCard } from "@/components/globe/globe-location-confirm-card";
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { usePersonalGlobePinSync } from "@/hooks/use-personal-globe-pin-sync";
import { usePendingBridgeInvites } from "@/hooks/use-pending-bridge-invites";
import { useGlobeTripArrival } from "@/hooks/use-globe-trip-arrival";
import { useGlobeContextPlaceAlignment } from "@/hooks/use-globe-context-place-alignment";
import { focusGlobeContextOnMap } from "@/lib/globe/focus-globe-context-on-map";
import {
  revertGlobeContextPinToCardPlace,
  resolveGlobeContextCardPinCluster,
} from "@/lib/globe/globe-context-card-coords";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import {
  globeContextTapHitRadiusMeters,
  resolveGlobeContextsNearTap,
} from "@/lib/globe/resolve-globe-contexts-near-tap";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import type { GlobeManageContextEntry } from "@/lib/globe/list-globe-manage-contexts";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { resolveGlobeContextPinCluster } from "@/lib/globe/resolve-globe-context-pin-cluster";
import { listGlobeContextPeerOptions } from "@/lib/globe/list-globe-context-peer-options";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { resolveGlobeContextPrimaryVideo } from "@/lib/globe/resolve-globe-context-primary-video";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { copy } from "@/lib/copy/human-ko";
import { projectBridgeGhostClusters } from "@/lib/experience-bridge/project-bridge-ghost-clusters";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";

const PIN_REVERT_MS = 1_100;
/** Pin tap and globe click fire together — ignore the follow-up globe press. */
const GLOBE_PIN_PRESS_SUPPRESS_MS = 900;

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const recallEventId = searchParams.get("recallEvent");
  const globeRef = useRef<RimvioGlobeHubHandle>(null);
  const liveLocation = useLiveLocationSnapshot();
  usePersonalGlobePinSync(true);
  const {
    invites: pendingBridgeInvites,
    dismissInvite,
    refresh: refreshBridgeInvites,
  } = usePendingBridgeInvites(true);
  const bridgeGhostClusters = useMemo(
    () => projectBridgeGhostClusters(pendingBridgeInvites),
    [pendingBridgeInvites],
  );
  const seenBridgeToastRef = useRef(new Set<string>());
  const [bridgeGhostOpen, setBridgeGhostOpen] = useState(false);
  const [bridgeGhostInvite, setBridgeGhostInvite] =
    useState<PendingBridgeInvite | null>(null);
  const [bridgeGhostCluster, setBridgeGhostCluster] = useState<PinCluster | null>(
    null,
  );
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<GlobeContextTimeFilter>("all");
  const [peopleFilter, setPeopleFilter] = useState<GlobeContextPeopleFilter>(null);
  const [peerOptionsRevision, setPeerOptionsRevision] = useState(0);
  const [pinDragOverrides, setPinDragOverrides] = useState<
    Map<string, { lat: number; lng: number }>
  >(() => new Map());
  const draggedEventIdRef = useRef<string | null>(null);
  const pinDragActiveRef = useRef(false);
  const revertTimerRef = useRef<number | null>(null);
  const activeClusterRef = useRef<PinCluster | null>(null);
  const sheetOpenRef = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stackClusters, setStackClusters] = useState<PinCluster[] | null>(null);
  const clustersRef = useRef<readonly PinCluster[]>([]);
  const detailLevelRef = useRef<GlobeDetailLevel>("space");
  const lastPinPressAtRef = useRef(0);

  const onClustersSnapshot = useCallback((clusters: readonly PinCluster[]) => {
    clustersRef.current = clusters;
  }, []);

  const onDetailLevelChange = useCallback((level: GlobeDetailLevel) => {
    detailLevelRef.current = level;
  }, []);

  const schedulePinRevertToCardPlace = useCallback((eventId: string) => {
    if (revertTimerRef.current !== null) {
      window.clearTimeout(revertTimerRef.current);
    }
    revertTimerRef.current = window.setTimeout(() => {
      revertTimerRef.current = null;
      revertGlobeContextPinToCardPlace(eventId);
      const cardCluster = resolveGlobeContextCardPinCluster(eventId);
      if (cardCluster) {
        globeRef.current?.flyToPin(cardCluster.lat, cardCluster.lng, "neighborhood");
      }
    }, PIN_REVERT_MS);
  }, []);

  const clearActiveContext = useCallback(() => {
    const eventId =
      draggedEventIdRef.current?.trim() || activeCluster?.eventId?.trim() || null;
    const hadDragPreview = pinDragActiveRef.current;

    if (revertTimerRef.current !== null) {
      window.clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }

    setSheetOpen(false);
    setActiveCluster(null);
    setStackClusters(null);
    setPinDragOverrides(new Map());
    pinDragActiveRef.current = false;
    draggedEventIdRef.current = null;

    if (eventId && hadDragPreview) {
      schedulePinRevertToCardPlace(eventId);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has("recallEvent")) {
      params.delete("recallEvent");
      const next = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState(null, "", next);
    }
  }, [activeCluster?.eventId, schedulePinRevertToCardPlace]);

  const openContextCluster = useCallback(
    (cluster: PinCluster, options?: { openSheet?: boolean }) => {
      globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
      setStackClusters(null);
      setActiveCluster(cluster);
      setSheetOpen(options?.openSheet !== false);

      const eventId = cluster.eventId?.trim();
      if (!eventId) {
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("recallEvent") !== eventId) {
        params.set("recallEvent", eventId);
        const next = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", next);
      }
    },
    [],
  );

  const markPinPress = useCallback(() => {
    lastPinPressAtRef.current = Date.now();
  }, []);

  const applyNearbyContexts = useCallback(
    (nearby: readonly PinCluster[], flyCluster?: PinCluster | null) => {
      if (nearby.length === 0) {
        if (globeContextTapHitRadiusMeters(detailLevelRef.current) == null) {
          return;
        }
        clearActiveContext();
        return;
      }

      if (flyCluster) {
        globeRef.current?.flyToPin(flyCluster.lat, flyCluster.lng, "neighborhood");
      }

      if (nearby.length === 1) {
        openContextCluster(nearby[0]!, { openSheet: true });
        return;
      }

      setStackClusters([...nearby]);
      setActiveCluster(null);
      setSheetOpen(false);
    },
    [clearActiveContext, openContextCluster],
  );

  const resolveNearbyAt = useCallback((tapLat: number, tapLng: number) => {
    return resolveGlobeContextsNearTap({
      tapLat,
      tapLng,
      clusters: clustersRef.current,
      detailLevel: detailLevelRef.current,
    });
  }, []);

  const peerOptions = useMemo(() => {
    void peerOptionsRevision;
    return listGlobeContextPeerOptions(listLifeEventCandidates());
  }, [peerOptionsRevision]);

  const activeContextEvent = useMemo(() => {
    const eventId = activeCluster?.eventId?.trim();
    if (!eventId) {
      return null;
    }
    return (
      findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId)
    );
  }, [activeCluster?.eventId]);

  const activeContextPrimaryVideo = useMemo(
    () => resolveGlobeContextPrimaryVideo(activeContextEvent),
    [activeContextEvent],
  );

  const showMapVideoReplay = Boolean(
    activeContextPrimaryVideo &&
      activeCluster?.eventId &&
      !sheetOpen &&
      !stackClusters?.length,
  );

  useEffect(() => {
    const refresh = () => setPeerOptionsRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);
  }, []);

  useEffect(() => {
    for (const invite of pendingBridgeInvites) {
      const eventId = invite.state.bridge.eventId;
      if (seenBridgeToastRef.current.has(eventId)) {
        continue;
      }
      seenBridgeToastRef.current.add(eventId);
      const host = invite.state.participants.find((row) => row.role === "host");
      const hostName =
        host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
      toast.message(
        copy.globe.bridgeInviteToast(hostName, invite.state.bridge.title),
      );
    }
  }, [pendingBridgeInvites]);

  const onContextGroupPress = useCallback(
    (clusters: readonly PinCluster[]) => {
      markPinPress();
      applyNearbyContexts(clusters, clusters[0] ?? null);
    },
    [applyNearbyContexts, markPinPress],
  );

  const onPinPress = useCallback(
    (cluster: PinCluster) => {
      markPinPress();
      if (cluster.variant === "bridge_ghost") {
        const invite = pendingBridgeInvites.find(
          (row) => row.state.bridge.eventId === cluster.eventId,
        );
        if (invite) {
          globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
          setBridgeGhostInvite(invite);
          setBridgeGhostCluster(cluster);
          setBridgeGhostOpen(true);
        }
        return;
      }
      openContextCluster(cluster, { openSheet: true });
    },
    [markPinPress, openContextCluster, pendingBridgeInvites],
  );

  const onGlobePress = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (pinDragActiveRef.current) {
        return;
      }
      if (Date.now() - lastPinPressAtRef.current < GLOBE_PIN_PRESS_SUPPRESS_MS) {
        return;
      }
      applyNearbyContexts(resolveNearbyAt(coords.lat, coords.lng));
    },
    [applyNearbyContexts, resolveNearbyAt],
  );

  const onSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
  }, []);

  const focusContextByEventId = useCallback(
    (eventId: string, options?: { openSheet?: boolean }) => {
      const result = focusGlobeContextOnMap(eventId);
      if (!result) {
        toast.error("맥락을 찾지 못했어요");
        return null;
      }
      const { cluster } = result;
      globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
      setStackClusters(null);
      setActiveCluster(cluster);
      if (options?.openSheet !== false) {
        setSheetOpen(true);
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("recallEvent") !== eventId) {
        params.set("recallEvent", eventId);
        const next = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", next);
      }
      return cluster;
    },
    [],
  );

  useGlobeTripArrival(
    {
      onArrival: ({ lat, lng, recallEventId, recallLine, placeLabel }) => {
        globeRef.current?.flyToPin(lat, lng, "neighborhood");
        const nearby = resolveNearbyAt(lat, lng);
        if (nearby.length > 1) {
          applyNearbyContexts(nearby);
          toast.message(recallLine || `${placeLabel} — 이 근처 맥락`);
          return;
        }
        focusContextByEventId(recallEventId, { openSheet: true });
        toast.message(recallLine || `${placeLabel}에 도착했어요`);
      },
    },
    { enabled: true },
  );

  const focusContextOnMap = useCallback(
    (eventId: string) => {
      focusContextByEventId(eventId, { openSheet: false });
    },
    [focusContextByEventId],
  );

  const onRecallEventId = useCallback(
    (eventId: string) => {
      setListOpen(false);
      setManageOpen(false);
      focusContextByEventId(eventId, { openSheet: true });
    },
    [focusContextByEventId],
  );

  useEffect(() => {
    const eventId = activeCluster?.eventId?.trim();
    if (!eventId) {
      return;
    }
    const sync = () => {
      if (pinDragActiveRef.current) {
        return;
      }
      const next = resolveGlobeContextPinCluster(eventId);
      if (!next) {
        return;
      }
      setActiveCluster((prev) => {
        if (!prev || prev.eventId !== eventId) {
          return prev;
        }
        if (prev.lat === next.lat && prev.lng === next.lng) {
          return prev;
        }
        globeRef.current?.flyToPin(next.lat, next.lng, "neighborhood");
        return next;
      });
    };
    window.addEventListener(EVENT_CANDIDATES_UPDATED, sync);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, sync);
  }, [activeCluster?.eventId]);

  const onPinRelocate = useCallback(
    (input: { pinId: string; sourceEventId: string; lat: number; lng: number }) => {
      pinDragActiveRef.current = true;
      draggedEventIdRef.current = input.sourceEventId;
      setPinDragOverrides((prev) => {
        const next = new Map(prev);
        next.set(input.pinId, { lat: input.lat, lng: input.lng });
        return next;
      });
      setActiveCluster((prev) =>
        prev?.eventId === input.sourceEventId
          ? { ...prev, lat: input.lat, lng: input.lng }
          : prev,
      );
    },
    [],
  );

  const pinCoordOverrides = useMemo(() => pinDragOverrides, [pinDragOverrides]);

  activeClusterRef.current = activeCluster;
  sheetOpenRef.current = sheetOpen;

  useGlobeContextPlaceAlignment({
    userLat: liveLocation?.lat ?? null,
    userLng: liveLocation?.lng ?? null,
    onAligned: ({ startupView, updated }) => {
      if (
        updated <= 0 ||
        activeClusterRef.current ||
        sheetOpenRef.current ||
        recallEventId ||
        !startupView
      ) {
        return;
      }
      globeRef.current?.flyToPin(
        startupView.lat,
        startupView.lng,
        startupView.level,
      );
    },
  });

  useEffect(() => {
    return () => {
      if (revertTimerRef.current !== null) {
        window.clearTimeout(revertTimerRef.current);
      }
    };
  }, []);

  const onStackSelect = useCallback(
    (cluster: PinCluster) => {
      openContextCluster(cluster, { openSheet: true });
    },
    [openContextCluster],
  );

  const openContextByEventId = useCallback(
    (eventId: string) => {
      setListOpen(false);
      focusContextByEventId(eventId, { openSheet: true });
    },
    [focusContextByEventId],
  );

  const openProjectedContext = useCallback(
    (entry: GlobeManageContextEntry) => {
      setManageOpen(false);
      focusContextByEventId(entry.eventId, { openSheet: true });
    },
    [focusContextByEventId],
  );

  const openContextEntry = useCallback(
    (entry: GlobeContextTimelineEntry) => {
      openContextByEventId(entry.eventId);
    },
    [openContextByEventId],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <RimvioGlobeHubClient
        globeRef={globeRef}
        className="h-full min-h-0 flex-1"
        initialRecallEventId={recallEventId}
        onRecallEventId={onRecallEventId}
        highlightedPinId={activeCluster?.pinId ?? null}
        onPinPress={onPinPress}
        onContextGroupPress={onContextGroupPress}
        onGlobePress={onGlobePress}
        onClustersSnapshot={onClustersSnapshot}
        onDetailLevelChange={onDetailLevelChange}
        pinRelocateEnabled
        onPinRelocate={onPinRelocate}
        timeFilter={timeFilter}
        peopleFilter={peopleFilter}
        pinCoordOverrides={pinCoordOverrides}
        bridgeGhostClusters={bridgeGhostClusters}
      />
      <GlobeContextStackPicker
        clusters={stackClusters ?? []}
        visible={Boolean(stackClusters && stackClusters.length > 1)}
        onSelect={onStackSelect}
        onDismiss={clearActiveContext}
        onShowAll={() => {
          setStackClusters(null);
          setListOpen(true);
        }}
      />
      <GlobeContextMapVideoStage
        globeRef={globeRef}
        eventId={activeCluster?.eventId ?? null}
        anchorLat={activeCluster?.lat ?? null}
        anchorLng={activeCluster?.lng ?? null}
        visible={showMapVideoReplay}
        onDismiss={clearActiveContext}
        onOpenDetails={() => setSheetOpen(true)}
      />
      <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20">
        <div className="pointer-events-auto">
          <GlobeContextControlDock
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            peopleFilter={peopleFilter}
            onPeopleFilterChange={setPeopleFilter}
            peerOptions={peerOptions}
            onCreate={() => setCreateOpen(true)}
            onList={() => setListOpen(true)}
            onManage={() => setManageOpen(true)}
            onFlyToHere={
              liveLocation
                ? () =>
                    globeRef.current?.flyToPin(
                      liveLocation.lat,
                      liveLocation.lng,
                      "neighborhood",
                    )
                : undefined
            }
          />
        </div>
      </div>
      <div className="pointer-events-none absolute right-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]"
          aria-label="지구본 설정"
          data-globe-settings-trigger
        >
          <Settings className="size-4 text-primary" aria-hidden />
        </button>
      </div>
      <GlobeContextIngestBar
        targetEventId={activeCluster?.eventId ?? null}
        targetTitle={activeCluster?.title ?? null}
        forceAttachToTarget={Boolean(activeCluster?.eventId)}
        onAttached={(eventId) => {
          const params = new URLSearchParams(window.location.search);
          if (params.get("recallEvent") !== eventId) {
            params.set("recallEvent", eventId);
            const next = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState(null, "", next);
          }
          focusContextOnMap(eventId);
        }}
      />
      <div className="pointer-events-none absolute inset-x-3 top-[calc(max(0.5rem,env(safe-area-inset-top))+3.25rem)] z-20 sm:inset-x-auto sm:left-auto sm:right-3 sm:max-w-[min(100%,22rem)]">
        <div className="pointer-events-auto">
          <ExperienceBridgeInviteBanner
            invites={pendingBridgeInvites}
            onAccepted={(eventId) => {
              dismissInvite(eventId);
              void refreshBridgeInvites();
              focusContextByEventId(eventId, { openSheet: true });
            }}
            onDismiss={dismissInvite}
          />
        </div>
      </div>
      <PinOpenSheet
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        cluster={activeCluster}
        onOpenDetail={() => {
          if (activeCluster) {
            globeRef.current?.flyToPin(
              activeCluster.lat,
              activeCluster.lng,
              "pin",
            );
          }
        }}
      />
      <GlobeCreateContextSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={({ event }) => {
          openContextByEventId(event.id);
        }}
      />
      <GlobeContextListSheet
        open={listOpen}
        onOpenChange={setListOpen}
        onSelect={openContextEntry}
      />
      <GlobeContextManageSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        onOpenContext={openProjectedContext}
        onDeleted={(eventIds) => {
          if (activeCluster && eventIds.includes(activeCluster.eventId)) {
            setSheetOpen(false);
            setActiveCluster(null);
          }
          const params = new URLSearchParams(window.location.search);
          const recall = params.get("recallEvent");
          if (recall && eventIds.includes(recall)) {
            params.delete("recallEvent");
            const next = params.toString()
              ? `${window.location.pathname}?${params.toString()}`
              : window.location.pathname;
            window.history.replaceState(null, "", next);
          }
        }}
      />
      <div className="pointer-events-none absolute inset-x-3 bottom-[var(--rimvio-globe-ingest-offset)] z-20 sm:inset-x-auto sm:right-3 sm:max-w-[280px] lg:bottom-[calc(var(--rimvio-globe-ingest-bar-height)+1.25rem)]">
        <div className="pointer-events-auto">
          <GlobeLocationConfirmCard />
        </div>
      </div>
      <ExperienceBridgeGhostSheet
        open={bridgeGhostOpen}
        onOpenChange={setBridgeGhostOpen}
        invite={bridgeGhostInvite}
        cluster={bridgeGhostCluster}
        onAccepted={(eventId) => {
          dismissInvite(eventId);
          void refreshBridgeInvites();
          focusContextByEventId(eventId, { openSheet: true });
        }}
        onDismissed={dismissInvite}
      />
      <GlobeSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

/** Globe-first home — pins only, tap → replay. */
export function GlobeHomeClient() {
  return (
    <Suspense fallback={null}>
      <GlobeHomeBody />
    </Suspense>
  );
}
