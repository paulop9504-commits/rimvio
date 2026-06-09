"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RimvioGlobe3DHandle } from "@/components/experience/rimvio-globe-3d";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { GlobeGpsPanel } from "@/components/globe/globe-gps-panel";
import { GlobeLocationConfirmCard } from "@/components/globe/globe-location-confirm-card";
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const recallEventId = searchParams.get("recallEvent");
  const globeRef = useRef<RimvioGlobe3DHandle>(null);
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const onPinPress = useCallback((cluster: PinCluster) => {
    globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
    setActiveCluster(cluster);
    setSheetOpen(true);
  }, []);

  const onSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      globeRef.current?.resetOverview();
    }
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <RimvioGlobeHubClient
        globeRef={globeRef}
        className="h-full min-h-0 flex-1"
        initialRecallEventId={recallEventId}
        onPinPress={onPinPress}
      />
      <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20 sm:right-auto">
        <div className="pointer-events-auto">
          <GlobeGpsPanel />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-[max(4.5rem,env(safe-area-inset-bottom))] z-20 sm:inset-x-auto sm:right-3 sm:max-w-[280px]">
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
