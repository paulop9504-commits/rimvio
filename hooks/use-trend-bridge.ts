"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadTrendBridgeSettings,
  patchTrendBridgeSettings,
  TREND_BRIDGE_SETTINGS_UPDATED,
} from "@/lib/globe/trend-bridge/trend-bridge-settings";
import type { TrendBridgeSettings } from "@/lib/globe/trend-bridge/trend-bridge-types";

export function useTrendBridge() {
  const [settings, setSettings] = useState<TrendBridgeSettings>(() =>
    loadTrendBridgeSettings(),
  );

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<TrendBridgeSettings>).detail;
      if (detail) {
        setSettings(detail);
        return;
      }
      setSettings(loadTrendBridgeSettings());
    };
    window.addEventListener(TREND_BRIDGE_SETTINGS_UPDATED, onUpdate);
    return () => window.removeEventListener(TREND_BRIDGE_SETTINGS_UPDATED, onUpdate);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    const next = patchTrendBridgeSettings({
      enabled,
      activeBridgeId: enabled ? loadTrendBridgeSettings().activeBridgeId : null,
    });
    setSettings(next);
    return next;
  }, []);

  const setActiveBridgeId = useCallback((activeBridgeId: string | null) => {
    const next = patchTrendBridgeSettings({
      enabled: true,
      activeBridgeId,
    });
    setSettings(next);
    return next;
  }, []);

  const setPulseIntent = useCallback((pulseIntent: TrendBridgeSettings["pulseIntent"]) => {
    const next = patchTrendBridgeSettings({ pulseIntent });
    setSettings(next);
    return next;
  }, []);

  return {
    settings,
    setEnabled,
    setActiveBridgeId,
    setPulseIntent,
    layerActive:
      settings.enabled === true && Boolean(settings.activeBridgeId?.trim()),
  };
}
