"use client";

import { useEffect, useState } from "react";
import {
  isGlobeComposeInputFocused,
  subscribeGlobeComposeInputFocus,
} from "@/lib/globe/compose-input-focus";
import {
  getLiveLocationSnapshot,
  subscribeLiveLocation,
} from "@/lib/location-ping/live-location-service";
import type { LiveLocationSnapshot } from "@/lib/location-ping/project-live-location-snapshot";

/** Shared GPS watch — one geolocation subscription for the whole app. */
export function useLiveLocationSnapshot(): LiveLocationSnapshot | null {
  const [snapshot, setSnapshot] = useState<LiveLocationSnapshot | null>(() =>
    getLiveLocationSnapshot(),
  );

  useEffect(() => {
    return subscribeLiveLocation((next) => {
      // GPS ticks must not re-render Globe home while Korean IME owns the thread.
      if (isGlobeComposeInputFocused()) {
        return;
      }
      setSnapshot(next);
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeComposeInputFocus((focused) => {
      if (!focused) {
        setSnapshot(getLiveLocationSnapshot());
      }
    });
  }, []);

  return snapshot;
}
