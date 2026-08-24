"use client";

import { useState, useMemo, useEffect, type RefObject } from "react";
import { useSearchParams } from "next/navigation";
import { GlobeContainerSpaceButton } from "@/components/globe/globe-container-space-button";
import { GlobeContextAgentMapButton } from "@/components/globe/globe-context-agent-map-button";
import { GlobeContainerSpaceSidebar } from "@/components/globe/globe-container-space-sidebar";
import { GlobeContextBrainStrip } from "@/components/globe/globe-context-brain-strip";
import { GlobeContextHubRail } from "@/components/globe/globe-context-hub-rail";
import { useMemoryRecallContext } from "@/components/globe/globe-home-memory-dock";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import type { GlobeContextPeerOption } from "@/lib/globe/list-globe-context-peer-options";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  listInProgressLiveWorks,
  subscribeLiveWorks,
} from "@/lib/globe/live-work/live-work-store";
import {
  PC_CONNECT_EVENT,
  PC_CONNECT_OPEN_SIDEBAR_EVENT,
} from "@/lib/pc-local-agent/desktop-connect";

export type GlobeHomeLeftChromeProps = {
  mapMediaFocusOpen: boolean;
  layerMode: GlobeLayerMode;
  timeFilter: GlobeContextTimeFilter;
  onTimeFilterChange: (filter: GlobeContextTimeFilter) => void;
  peopleFilter: GlobeContextPeopleFilter;
  onPeopleFilterChange: (filter: GlobeContextPeopleFilter) => void;
  peerOptions: readonly GlobeContextPeerOption[];
  onCreatePhoto: () => void;
  onOpenList: () => void;
  onOpenManage: () => void;
  onSelectContext?: (entry: GlobeContextTimelineEntry) => void;
  onAgentContextPick?: (entry: GlobeContextTimelineEntry) => void;
  contextAgentArming?: boolean;
  onContextAgentBind?: () => void;
  onToggleContextAgentArm?: () => void;
  onContextsDeleted?: (eventIds: string[]) => void;
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
  operatorBlueprint?: import("@/lib/context-blueprint/types").ContextBlueprint | null;
  executionPlan?: import("@/lib/context-execution").ContextExecutionPlanV1 | null;
  onApproveExecutionPlan?: () => void | Promise<void>;
  trendBridge: {
    enabled: boolean;
    activeBridgeId: string | null;
    pulseIntent: "align" | "avoid";
    onToggle: (enabled: boolean) => void;
    onBridgeSelect: (bridgeId: string) => void;
    onPulseIntentChange: (intent: "align" | "avoid") => void;
  };
};

/** Top-left globe — sidebar trigger + context hub rail only (ADR-027: no layer toggle). */
export function GlobeHomeLeftChrome({
  mapMediaFocusOpen,
  layerMode,
  timeFilter,
  onTimeFilterChange,
  peopleFilter,
  onPeopleFilterChange,
  peerOptions,
  onCreatePhoto,
  onOpenList,
  onOpenManage,
  onSelectContext,
  onAgentContextPick,
  contextAgentArming = false,
  onContextAgentBind,
  onToggleContextAgentArm,
  onContextsDeleted,
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
  operatorBlueprint = null,
  executionPlan = null,
  onApproveExecutionPlan,
  trendBridge,
}: GlobeHomeLeftChromeProps) {
  const [containerSpaceOpen, setContainerSpaceOpen] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const memoryRecall = useMemoryRecallContext();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sync = () => setLiveCount(listInProgressLiveWorks().length);
    sync();
    return subscribeLiveWorks(sync);
  }, []);

  useEffect(() => {
    const nonce = searchParams.get("pcConnect")?.trim();
    if (!nonce) {
      return;
    }
    setContainerSpaceOpen(true);
    sessionStorage.setItem("rimvio-pc-connect-nonce", nonce);
    window.dispatchEvent(new CustomEvent(PC_CONNECT_EVENT, { detail: { nonce } }));
  }, [searchParams]);

  useEffect(() => {
    const open = () => setContainerSpaceOpen(true);
    window.addEventListener(PC_CONNECT_OPEN_SIDEBAR_EVENT, open);
    return () => window.removeEventListener(PC_CONNECT_OPEN_SIDEBAR_EVENT, open);
  }, []);

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
              liveCount={liveCount}
              onPress={() => setContainerSpaceOpen((open) => !open)}
            />
          </div>
          {onToggleContextAgentArm ? (
            <div className="pointer-events-auto">
              <GlobeContextAgentMapButton
                arming={contextAgentArming}
                onPress={onToggleContextAgentArm}
              />
            </div>
          ) : null}
        </>
      ) : null}
      <GlobeContainerSpaceSidebar
        open={containerSpaceOpen}
        onOpenChange={setContainerSpaceOpen}
        activeEventId={hubEventId}
        onSelect={(entry) => onSelectContext?.(entry)}
        onAgentContextPick={onAgentContextPick}
        onDeleted={onContextsDeleted}
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
        onFlyToRuntime={(lat, lng) =>
          globeRef.current?.flyToPin(lat, lng, "neighborhood")
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
              onContextAgentBind={onContextAgentBind}
              className="pointer-events-auto"
            />
          ) : null}
          {!suppressMapHubRail ? (
            <GlobeContextHubRail
              className="pointer-events-auto"
              visible={!globeRenderSuspended}
              activeEventId={hubEventId}
              operatorBlueprint={operatorBlueprint}
              executionPlan={executionPlan}
              onApproveExecutionPlan={onApproveExecutionPlan}
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
