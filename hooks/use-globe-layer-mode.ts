"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GLOBE_LAYER_MODE_UPDATED,
  readGlobeLayerMode,
  writeGlobeLayerMode,
  type GlobeLayerMode,
} from "@/lib/globe/globe-layer-mode";

export function useGlobeLayerMode() {
  const [layerMode, setLayerModeState] = useState<GlobeLayerMode>("personal");

  useEffect(() => {
    const sync = () => setLayerModeState(readGlobeLayerMode());
    sync();
    window.addEventListener(GLOBE_LAYER_MODE_UPDATED, sync);
    return () => window.removeEventListener(GLOBE_LAYER_MODE_UPDATED, sync);
  }, []);

  const setLayerMode = useCallback((mode: GlobeLayerMode) => {
    setLayerModeState(writeGlobeLayerMode(mode));
  }, []);

  return { layerMode, setLayerMode };
}
