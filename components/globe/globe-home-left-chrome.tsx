"use client";

import type { RefObject } from "react";
import { GlobeContextControlDock } from "@/components/globe/globe-context-control-dock";
import { GlobeContextHubRail } from "@/components/globe/globe-context-hub-rail";
import { GlobeLayerModeToggle } from "@/components/globe/globe-layer-mode-toggle";
import { GlobeTrendBridgePulseChip } from "@/components/globe/globe-trend-bridge-pulse-chip";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import type { GlobeContextPeerOption } from "@/lib/globe/list-globe-context-peer-options";

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
  liveLat: number | null;
  liveLng: number | null;
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  hubEventId: string | null;
  hubDetailOpen: boolean;
  suppressMapHubRail: boolean;
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

/** Top-left globe controls — layer mode · filters · trend pulse · hub rail. */
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
  liveLat,
  liveLng,
  globeRef,
  hubEventId,
  hubDetailOpen,
  suppressMapHubRail,
  globeRenderSuspended,
  authUserId,
  trendBridge,
}: GlobeHomeLeftChromeProps) {
  return (
    <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex max-h-[calc(100%-var(--rimvio-globe-ingest-offset)-5.5rem)] flex-col items-start gap-1.5">
      {!mapMediaFocusOpen ? (
        <>
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
          {layerMode === "personal" ? (
            <div className="pointer-events-auto">
              <GlobeContextControlDock
                timeFilter={timeFilter}
                onTimeFilterChange={onTimeFilterChange}
                peopleFilter={peopleFilter}
                onPeopleFilterChange={onPeopleFilterChange}
                peerOptions={peerOptions}
                onCreate={onCreatePhoto}
                onList={onOpenList}
                onManage={onOpenManage}
                onFlyToHere={
                  liveLat != null && liveLng != null
                    ? () =>
                        globeRef.current?.flyToPin(liveLat, liveLng, "neighborhood")
                    : undefined
                }
              />
            </div>
          ) : null}
          {layerMode === "personal" && !hubEventId ? (
            <GlobeTrendBridgePulseChip
              className="pointer-events-auto"
              enabled={trendBridge.enabled}
              activeBridgeId={trendBridge.activeBridgeId}
              pulseIntent={trendBridge.pulseIntent}
              onToggle={trendBridge.onToggle}
              onBridgeSelect={trendBridge.onBridgeSelect}
              onPulseIntentChange={trendBridge.onPulseIntentChange}
            />
          ) : null}
        </>
      ) : null}
      {hubEventId && !hubDetailOpen && !suppressMapHubRail ? (
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
    </div>
  );
}
