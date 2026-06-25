"use client";

import { useEffect } from "react";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { pingMarketTradeGuestLocationRemote } from "@/lib/globe/market/client/fetch-market-trades-client";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";

const GUEST_PING_MS = 30_000;

/** Session-scoped guest location ping while buyer is en route (HOST mode). */
export function useMarketTradeGuestPing(input: {
  enabled: boolean;
  sessions: readonly MarketTradeSessionView[];
  onSessionUpdated?: (session: MarketTradeSessionView) => void;
}) {
  const liveLocation = useLiveLocationSnapshot();

  useEffect(() => {
    if (!input.enabled) {
      return;
    }

    const enRoute = input.sessions.filter(
      (session) =>
        session.viewerRole === "seeking" &&
        session.tradeStatus === "en_route" &&
        session.guestShareLocation,
    );
    if (enRoute.length === 0) {
      return;
    }

    const pingAll = () => {
      const lat = liveLocation?.lat;
      const lng = liveLocation?.lng;
      if (lat == null || lng == null) {
        return;
      }
      for (const session of enRoute) {
        void pingMarketTradeGuestLocationRemote({
          handshakeId: session.handshakeId,
          lat,
          lng,
        })
          .then((updated) => {
            if (updated) {
              input.onSessionUpdated?.(updated);
            }
          })
          .catch(() => undefined);
      }
    };

    pingAll();
    const id = window.setInterval(pingAll, GUEST_PING_MS);
    return () => window.clearInterval(id);
  }, [input.enabled, input.onSessionUpdated, input.sessions, liveLocation?.lat, liveLocation?.lng]);
}
