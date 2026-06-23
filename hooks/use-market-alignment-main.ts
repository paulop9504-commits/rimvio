"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/copy/human-ko";
import { useAuth } from "@/hooks/use-auth";
import { fetchMarketAlignmentOfferRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import {
  listActiveMarketIntents,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { resolveMarketAlignment } from "@/lib/globe/market/resolve-market-alignment";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";

const DISMISS_KEY = "rimvio-market-align-dismissed";
const MATCH_POLL_MS = 12_000;

function readDismissedMatchId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function resolveDismissKey(offer: MarketAlignmentOffer): string {
  return (
    offer.handshakeId ??
    offer.matchIntentServerId ??
    offer.matchIntentId
  );
}

export function dismissMarketAlignment(offer: MarketAlignmentOffer): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(DISMISS_KEY, resolveDismissKey(offer));
  } catch {
    // ignore
  }
}

export function useMarketAlignmentMain(input: {
  enabled: boolean;
  focusEventId?: string | null;
}): {
  offer: MarketAlignmentOffer | null;
  loading: boolean;
  dismiss: () => void;
} {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const [remoteOffer, setRemoteOffer] = useState<MarketAlignmentOffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(() =>
    readDismissedMatchId(),
  );

  useEffect(() => subscribeMarketIntents(() => setRevision((n) => n + 1)), []);

  useEffect(() => {
    if (!input.enabled) {
      return;
    }
    const id = window.setInterval(() => setRevision((n) => n + 1), MATCH_POLL_MS);
    return () => window.clearInterval(id);
  }, [input.enabled]);

  useEffect(() => {
    if (!input.enabled) {
      setRemoteOffer(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const offer = user?.id
        ? await fetchMarketAlignmentOfferRemote({
            focusEventId: input.focusEventId,
          })
        : null;
      if (!cancelled) {
        setRemoteOffer(offer);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input.enabled, input.focusEventId, revision, user?.id]);

  const localOffer = useMemo(() => {
    if (!input.enabled) {
      return null;
    }
    void revision;
    return resolveMarketAlignment({
      intents: listActiveMarketIntents(),
      focusEventId: input.focusEventId,
      copy: {
        headlineSeeking: copy.globe.marketAlignHeadlineSeeking,
        headlineListing: copy.globe.marketAlignHeadlineListing,
        body: copy.globe.marketAlignBody,
        cta: copy.globe.marketAlignCta,
      },
    });
  }, [input.enabled, input.focusEventId, revision]);

  const offer = useMemo(() => {
    const resolved = user?.id ? remoteOffer ?? localOffer : localOffer;
    if (!resolved) {
      return null;
    }
    const dismissKey = resolveDismissKey(resolved);
    if (dismissedId && dismissedId === dismissKey) {
      return null;
    }
    return resolved;
  }, [dismissedId, localOffer, remoteOffer, user?.id]);

  const dismiss = useCallback(() => {
    if (!offer) {
      return;
    }
    const dismissKey = resolveDismissKey(offer);
    dismissMarketAlignment(offer);
    setDismissedId(dismissKey);
  }, [offer]);

  return { offer, loading, dismiss };
}
