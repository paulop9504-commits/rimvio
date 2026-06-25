"use client";

import { useEffect, useMemo, useState } from "react";
import { listLifeEventCandidates, EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";
import { resolveGlobeContextTriggers } from "@/lib/globe/context-triggers/resolve-globe-context-triggers";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";

export function useGlobeContextTriggers(input: {
  enabled: boolean;
  layerMode: GlobeLayerMode;
}): GlobeContextTrigger[] {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!input.enabled || typeof window === "undefined") {
      return;
    }
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, [input.enabled]);

  return useMemo(() => {
    if (!input.enabled) {
      return [];
    }
    void revision;
    return resolveGlobeContextTriggers({
      events: listLifeEventCandidates(),
      layerMode: input.layerMode,
    });
  }, [input.enabled, input.layerMode, revision]);
}
