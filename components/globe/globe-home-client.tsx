"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, CalendarRange, ListChecks, Settings } from "lucide-react";
import { toast } from "sonner";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { GlobeContextMapVideoStage } from "@/components/globe/globe-context-map-video-stage";
import { GlobeContextIngestBar } from "@/components/globe/globe-context-ingest-bar";
import { GlobeContextListSheet } from "@/components/globe/globe-context-list-sheet";
import { GlobeContextManageSheet } from "@/components/globe/globe-context-manage-sheet";
import { GlobeCreateContextSheet } from "@/components/globe/globe-create-context-sheet";
import { GlobeGpsPanel } from "@/components/globe/globe-gps-panel";
import { GlobeSettingsSheet } from "@/components/globe/globe-settings-sheet";
import { GlobeLocationConfirmCard } from "@/components/globe/globe-location-confirm-card";
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { buildPinClusterFromEvent, buildPinClusterFromPersonalPin } from "@/lib/globe/build-pin-cluster-from-event";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import type { GlobeManageContextEntry } from "@/lib/globe/list-globe-manage-contexts";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { findLifeEventCandidate } from "@/lib/life-read-model";

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const recallEventId = searchParams.get("recallEvent");
  const globeRef = useRef<RimvioGlobeHubHandle>(null);
  const liveLocation = useLiveLocationSnapshot();
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const onPinPress = useCallback((cluster: PinCluster) => {
    globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
    setActiveCluster(cluster);
    setSheetOpen(true);
  }, []);

  const clearActiveContext = useCallback(() => {
    setSheetOpen(false);
    setActiveCluster(null);
    const params = new URLSearchParams(window.location.search);
    if (params.has("recallEvent")) {
      params.delete("recallEvent");
      const next = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState(null, "", next);
    }
  }, []);

  const onSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
  }, []);

  const focusContextOnMap = useCallback((eventId: string) => {
    let event = findLifeEventCandidate(eventId);
    if (!event) {
      event = recoverGlobeContextEventFromPin(eventId);
    }
    if (!event) {
      return;
    }
    const cluster = buildPinClusterFromEvent(event);
    globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
    setActiveCluster(cluster);
  }, []);

  const openPinCluster = useCallback((cluster: PinCluster, eventId: string) => {
    requestAnimationFrame(() => {
      globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
      setActiveCluster(cluster);
      setSheetOpen(true);
      const params = new URLSearchParams(window.location.search);
      if (params.get("recallEvent") !== eventId) {
        params.set("recallEvent", eventId);
        const next = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", next);
      }
    });
  }, []);

  const openContextByEventId = useCallback(
    (eventId: string) => {
      let event = findLifeEventCandidate(eventId);
      if (!event) {
        event = recoverGlobeContextEventFromPin(eventId);
      }
      if (!event) {
        const pin = findPersonalGlobePinByEventId(eventId);
        if (pin) {
          setListOpen(false);
          openPinCluster(buildPinClusterFromPersonalPin(pin), eventId);
          return;
        }
        toast.error("맥락을 찾지 못했어요");
        return;
      }
      setListOpen(false);
      openPinCluster(buildPinClusterFromEvent(event), event.id);
    },
    [openPinCluster],
  );

  const openProjectedContext = useCallback(
    (entry: GlobeManageContextEntry) => {
      setManageOpen(false);
      const event = findLifeEventCandidate(entry.eventId);
      const cluster = event
        ? buildPinClusterFromEvent(event)
        : {
            pinId: entry.pinId,
            eventId: entry.eventId,
            title: entry.title,
            placeLabel: entry.place,
            lat: entry.lat,
            lng: entry.lng,
            dateLabel: entry.dateLabel,
            startedAtIso: null,
            evidence: {
              photoCount: entry.photoCount,
              videoCount: entry.videoCount,
              chatCount: 0,
              placePinCount: 0,
            },
            recallLine: null,
          };
      openPinCluster(cluster, entry.eventId);
    },
    [openPinCluster],
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
        highlightedPinId={activeCluster?.pinId ?? null}
        onPinPress={onPinPress}
      />
      <GlobeContextMapVideoStage
        eventId={activeCluster?.eventId ?? null}
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
