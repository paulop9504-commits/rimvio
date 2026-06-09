"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RimvioGlobe3DHandle } from "@/components/experience/rimvio-globe-3d";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const recallEventId = searchParams.get("recallEvent");
  const globeRef = useRef<RimvioGlobe3DHandle>(null);
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const onPinPress = useCallback((cluster: PinCluster) => {
    globeRef.current?.flyToPin(cluster.lat, cluster.lng, "city");
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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <RimvioGlobeHubClient
        globeRef={globeRef}
        className="h-full min-h-0 flex-1"
        initialRecallEventId={recallEventId}
        onPinPress={onPinPress}
      />
      <PinOpenSheet
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        cluster={activeCluster}
        onOpenDetail={() => {
          if (activeCluster) {
            globeRef.current?.flyToPin(
              activeCluster.lat,
              activeCluster.lng,
              "street",
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
