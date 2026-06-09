"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const recallEventId = searchParams.get("recallEvent");
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const onPinPress = useCallback((cluster: PinCluster) => {
    setActiveCluster(cluster);
    setSheetOpen(true);
  }, []);

  return (
    <>
      <RimvioGlobeHubClient
        className="min-h-0 flex-1"
        initialRecallEventId={recallEventId}
        onPinPress={onPinPress}
      />
      <PinOpenSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cluster={activeCluster}
      />
    </>
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
