"use client";

import { useState, useMemo, type RefObject } from "react";
import { GlobeContainerSpaceButton } from "@/components/globe/globe-container-space-button";
import { GlobeContainerSpaceSidebar } from "@/components/globe/globe-container-space-sidebar";
import { GlobeContextBrainStrip } from "@/components/globe/globe-context-brain-strip";
import { GlobeContextHubRail } from "@/components/globe/globe-context-hub-rail";
import { GlobeLayerModeToggle } from "@/components/globe/globe-layer-mode-toggle";
import { useMemoryRecallContext } from "@/components/globe/globe-home-memory-dock";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import type { GlobeContextPeerOption } from "@/lib/globe/list-globe-context-peer-options";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type GlobeHomeLeftChromeProps = {
  mapMediaFocusOpen: boolean;
  layerMode: GlobeLayerMode;
  onLayerModeChange: (mode: GlobeLayerMode) => void;
  timeFilter: GlobeContextTimeFilter;
  onTimeFilterChange: (filter: GlobeContextTimeFilter) => void;
  peopleFilter: GlobeContextPeopleFilter;
  onPeopleFilterChange: (filter: GlobeContextPeopleFilter) => void;
  peerOptions: readonly GlobeContextPeerOption[];
  onCreatePhoto: () => void;
  onOpenList: () => void;
  onOpenManage: () => void;
  onSelectContext?: (entry: GlobeContextTimelineEntry) => void;
  onNewContext?: () => void;
  onPortalPeekToggle: () => void;
  inboxCount: number;
  mediaPoolCount: number;
  marketManageCount: number;
  workQueueCount: number;
  onOpenInbox: () => void;
  onOpenMediaPool: () => void;
  onOpenMarketManage?: () => void;
  onOpenSettings: () => void;
  onOpenWorkQueue: () => void;
  liveLat: number | null;
  liveLng: number | null;
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  hubEventId: string | null;
  hubDetailOpen: boolean;
  suppressMapHubRail: boolean;
  suppressBrainStrip?: boolean;
  globeRenderSuspended: boolean;
  authUserId: string | null;
  trendBridge: {
    enabled: boolean;
    activeBridgeId: string | null;
    pulseIntent: "align" | "avoid";
    onToggle: (enabled: boolean) => void;
    onBridgeSelect: (bridgeId: string) => void;
    onPulseIntentChange: (intent: "align" | "avoid") => void;
  };
};

/** Top-left globe — sidebar trigger + layer toggle + context hub rail only. */
export function GlobeHomeLeftChrome({
  mapMediaFocusOpen,
  layerMode,
  onLayerModeChange,
  timeFilter,
  onTimeFilterChange,
  peopleFilter,
  onPeopleFilterChange,
  peerOptions,
  onCreatePhoto,
  onOpenList,
  onOpenManage,
  onSelectContext,
  onNewContext,
  onPortalPeekToggle,
  inboxCount,
  mediaPoolCount,
  marketManageCount,
  workQueueCount,
  onOpenInbox,
  onOpenMediaPool,
  onOpenMarketManage,
  onOpenSettings,
  onOpenWorkQueue,
  liveLat,
  liveLng,
  globeRef,
  hubEventId,
  hubDetailOpen,
  suppressMapHubRail,
  suppressBrainStrip = false,
  globeRenderSuspended,
  authUserId,
  trendBridge,
}: GlobeHomeLeftChromeProps) {
  const [containerSpaceOpen, setContainerSpaceOpen] = useState(false);
  const memoryRecall = useMemoryRecallContext();

  const hubEvent = useMemo(() => {
    const eventId = hubEventId?.trim();
    return eventId ? findLifeEventCandidate(eventId) : null;
  }, [hubEventId]);

  return (
    <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex max-h-[calc(100%-var(--rimvio-globe-ingest-offset)-5.5rem)] flex-col items-start gap-1.5">
      {!mapMediaFocusOpen ? (
        <>
          <div className="pointer-events-auto">
            <GlobeContainerSpaceButton
              open={containerSpaceOpen}
              onPress={() => setContainerSpaceOpen((open) => !open)}
            />
          </div>
          <div className="pointer-events-auto">
            <GlobeLayerModeToggle mode={layerMode} onModeChange={onLayerModeChange} />
          </div>
          {layerMode === "discovery" ? (
            <p
              className="pointer-events-none max-w-[11rem] px-1 text-[11px] font-medium leading-snug text-muted-foreground"
              data-globe-layer-mode-hint
            >
              {copy.globe.layerModeDiscoveryHint}
            </p>
          ) : null}
        </>
      ) : null}
      <GlobeContainerSpaceSidebar
        open={containerSpaceOpen}
        onOpenChange={setContainerSpaceOpen}
        activeEventId={hubEventId}
        onSelect={(entry) => onSelectContext?.(entry)}
        onNewContext={onNewContext}
        layerMode={layerMode}
        timeFilter={timeFilter}
        onTimeFilterChange={onTimeFilterChange}
        peopleFilter={peopleFilter}
        onPeopleFilterChange={onPeopleFilterChange}
        peerOptions={peerOptions}
        onCreatePhoto={onCreatePhoto}
        onOpenList={onOpenList}
        onOpenManage={onOpenManage}
        onFlyToHere={
          liveLat != null && liveLng != null
            ? () => globeRef.current?.flyToPin(liveLat, liveLng, "neighborhood")
            : undefined
        }
        inboxCount={inboxCount}
        mediaPoolCount={mediaPoolCount}
        marketManageCount={marketManageCount}
        workQueueCount={workQueueCount}
        onOpenInbox={onOpenInbox}
        onOpenMediaPool={onOpenMediaPool}
        onOpenMarketManage={onOpenMarketManage}
        onOpenSettings={onOpenSettings}
        onOpenWorkQueue={onOpenWorkQueue}
        onPortalPeekToggle={onPortalPeekToggle}
        memoryRecall={
          memoryRecall?.hasContent
            ? {
                hasContent: true,
                open: memoryRecall.panelOpen,
                onToggle: memoryRecall.onToggle,
              }
            : null
        }
        trendBridge={trendBridge}
      />
      {hubEventId && !hubDetailOpen ? (
        <>
          {hubEvent && !globeRenderSuspended && !suppressBrainStrip ? (
            <GlobeContextBrainStrip
              event={hubEvent}
              variant="corner-pill"
              className="pointer-events-auto"
            />
          ) : null}
          {!suppressMapHubRail ? (
            <GlobeContextHubRail
              className="pointer-events-auto"
              visible={!globeRenderSuspended}
              activeEventId={hubEventId}
              lat={liveLat}
              lng={liveLng}
              authUserId={authUserId}
              layout="dock"
              variant="compact"
              globeRef={globeRef}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
