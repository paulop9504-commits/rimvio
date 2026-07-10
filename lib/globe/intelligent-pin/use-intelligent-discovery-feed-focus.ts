"use client";

import { useEffect, useState } from "react";
import {
  subscribeIntelligentDiscoveryFeedClose,
  subscribeIntelligentDiscoveryFeedOpen,
} from "@/lib/globe/intelligent-pin/intelligent-pin-bridge";

/** True while the infinite discovery feed is open for this context. */
export function useIntelligentDiscoveryFeedFocus(
  contextEventId: string | null | undefined,
): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const id = contextEventId?.trim();
    if (!id) {
      setActive(false);
      return;
    }
    let openForEvent = false;
    const sync = () => setActive(openForEvent);
    const unsubOpen = subscribeIntelligentDiscoveryFeedOpen((detail) => {
      openForEvent = detail.contextEventId === id;
      sync();
    });
    const unsubClose = subscribeIntelligentDiscoveryFeedClose((detail) => {
      if (detail.contextEventId === id) {
        openForEvent = false;
        sync();
      }
    });
    return () => {
      unsubOpen();
      unsubClose();
    };
  }, [contextEventId]);

  return active;
}
