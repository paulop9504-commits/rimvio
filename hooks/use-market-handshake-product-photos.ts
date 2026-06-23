"use client";

import { useMemo } from "react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { projectPlaceGallery } from "@/lib/globe/project-place-gallery";
import type { MarketHandshakeRoomState } from "@/lib/globe/market/client/sync-market-intent-remote";

export function useMarketHandshakeProductPhotos(
  handshake: MarketHandshakeRoomState,
): { heroUrl: string | null; galleryUrls: string[] } {
  return useMemo(() => {
    const remote = (handshake.product.photoUrls ?? []).filter((url) => url.trim().length > 0);
    if (remote.length > 0) {
      return { heroUrl: remote[0] ?? null, galleryUrls: remote };
    }

    const event = findLifeEventCandidate(handshake.product.listingEventId);
    const gallery = projectPlaceGallery({ event, volume: null, limit: 6 })
      .map((row) => row.imageUrl)
      .filter((url): url is string => Boolean(url?.trim()));

    return {
      heroUrl: gallery[0] ?? null,
      galleryUrls: gallery,
    };
  }, [
    handshake.product.listingEventId,
    handshake.product.photoUrls,
  ]);
}
