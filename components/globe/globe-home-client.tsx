"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, CalendarRange, ListChecks, Settings } from "lucide-react";
import { toast } from "sonner";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { GlobeContextMapVideoStage } from "@/components/globe/globe-context-map-video-stage";
import { GlobeContextIngestBar } from "@/components/globe/globe-context-ingest-bar";
import { GlobeContextListSheet } from "@/components/globe/globe-context-list-sheet";
import { GlobeContextManageSheet } from "@/components/globe/globe-context-manage-sheet";
import { GlobeContextPinCard } from "@/components/globe/globe-context-pin-card";
import { GlobeContextTimeFilterChips } from "@/components/globe/globe-context-time-filter-chips";
import { GlobeCreateContextSheet } from "@/components/globe/globe-create-context-sheet";
import { GlobeGpsPanel } from "@/components/globe/globe-gps-panel";
import { GlobeSettingsSheet } from "@/components/globe/globe-settings-sheet";
import { GlobeLocationConfirmCard } from "@/components/globe/globe-location-confirm-card";
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useGlobeContextPlaceAlignment } from "@/hooks/use-globe-context-place-alignment";
import { focusGlobeContextOnMap } from "@/lib/globe/focus-globe-context-on-map";
import {
  revertGlobeContextPinToCardPlace,
  resolveGlobeContextCardPinCluster,
} from "@/lib/globe/globe-context-card-coords";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import type { GlobeManageContextEntry } from "@/lib/globe/list-globe-manage-contexts";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { resolveGlobeContextPinCluster } from "@/lib/globe/resolve-globe-context-pin-cluster";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";

const PIN_REVERT_MS = 1_100;

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const recallEventId = searchParams.get("recallEvent");
  const globeRef = useRef<RimvioGlobeHubHandle>(null);
  const liveLocation = useLiveLocationSnapshot();
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<GlobeContextTimeFilter>("all");
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

  const onPinPress = useCallback((cluster: PinCluster) => {
    globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
    setActiveCluster(cluster);
    setSheetOpen(false);
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
        pinRelocateEnabled
        onPinRelocate={onPinRelocate}
        timeFilter={timeFilter}
        pinCoordOverrides={pinCoordOverrides}
      />
      <GlobeContextPinCard
        globeRef={globeRef}
        cluster={activeCluster}
        visible={Boolean(activeCluster?.eventId) && !sheetOpen}
        onOpenSheet={() => setSheetOpen(true)}
        onDismiss={clearActiveContext}
      />
      <GlobeContextMapVideoStage
        globeRef={globeRef}
        eventId={activeCluster?.eventId ?? null}
        anchorLat={activeCluster?.lat ?? null}
        anchorLng={activeCluster?.lng ?? null}
        visible={Boolean(activeCluster?.eventId)}
        onDismiss={clearActiveContext}
      />
      <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex flex-col gap-2 sm:right-auto">
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-2 text-[12px] font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]"
            data-globe-create-context-trigger
          >
            <CalendarPlus className="size-3.5 text-primary" aria-hidden />
            맥락 만들기
          </button>
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-2 text-[12px] font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]"
            data-globe-context-list-trigger
          >
            <CalendarRange className="size-3.5 text-primary" aria-hidden />
            내 맥락
          </button>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-2 text-[12px] font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]"
            data-globe-context-manage-trigger
          >
            <ListChecks className="size-3.5 text-primary" aria-hidden />
            맥락 관리
          </button>
        </div>
        <div className="pointer-events-auto">
          <GlobeContextTimeFilterChips
            value={timeFilter}
            onChange={setTimeFilter}
          />
        </div>
        <div className="pointer-events-auto">
          <GlobeGpsPanel
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
      <div className="pointer-events-none absolute inset-x-3 bottom-[var(--rimvio-globe-ingest-offset)] z-20 sm:inset-x-auto sm:right-3 sm:max-w-[280px] lg:bottom-[calc(var(--rimvio-globe-ingest-bar-height)+1.25rem)]">
        <div className="pointer-events-auto">
          <GlobeLocationConfirmCard />
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
