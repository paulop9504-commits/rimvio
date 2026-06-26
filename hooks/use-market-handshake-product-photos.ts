"use client";

import { useMemo } from "react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { projectPlaceGallery } from "@/lib/globe/project-place-gallery";
import { pickMarketListingThumbUrls } from "@/lib/globe/market/market-listing-media";
import type { MarketHandshakeRoomState } from "@/lib/globe/market/client/sync-market-intent-remote";

export function useMarketHandshakeProductPhotos(
  handshake: MarketHandshakeRoomState,
): { heroUrl: string | null; heroVideoUrl: string | null; galleryUrls: string[] } {
  return useMemo(() => {
    const { photoUrl, videoUrl } = pickMarketListingThumbUrls({
      photoUrls: handshake.product.photoUrls,
      videoUrls: handshake.product.videoUrls,
    });
    if (videoUrl || photoUrl) {
      const gallery = [
        ...(videoUrl ? [videoUrl] : []),
        ...(handshake.product.photoUrls ?? []).filter((url) => url.trim().length > 0),
      ];
      return {
        heroUrl: videoUrl ?? photoUrl,
        heroVideoUrl: videoUrl,
        galleryUrls: gallery,
      };
    }

    const event = findLifeEventCandidate(handshake.product.listingEventId);
    const gallery = projectPlaceGallery({ event, volume: null, limit: 6 })
      .map((row) => row.imageUrl)
      .filter((url): url is string => Boolean(url?.trim()));

    return {
      heroUrl: gallery[0] ?? null,
      heroVideoUrl: null,
      galleryUrls: gallery,
    };
  }, [
    handshake.product.listingEventId,
    handshake.product.photoUrls,
    handshake.product.videoUrls,
  ]);
}
