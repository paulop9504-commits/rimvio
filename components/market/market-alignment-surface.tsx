"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MarketAlignmentMainCard } from "@/components/market/market-alignment-main-card";
import { copy } from "@/lib/copy/human-ko";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import {
  acceptMarketHandshakeRemote,
} from "@/lib/globe/market/client/sync-market-intent-remote";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";
import {
  buildKakaoMapRouteHref,
  buildKakaoMapRouteWebHref,
} from "@/lib/resolvers/deep-links";
import { peerRoomPath } from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { useMarketAlignmentMain } from "@/hooks/use-market-alignment-main";

export type MarketAlignmentSurfaceProps = {
  enabled: boolean;
  focusEventId?: string | null;
  onFocusMatchEvent?: (eventId: string) => void;
  onFocusMatchOffer?: (offer: MarketAlignmentOffer) => void;
  className?: string;
};

export function MarketAlignmentSurface({
  enabled,
  focusEventId,
  onFocusMatchEvent,
  onFocusMatchOffer,
  className,
}: MarketAlignmentSurfaceProps) {
  const router = useRouter();
  const [actionBusy, setActionBusy] = useState(false);
  const { offer, dismiss } = useMarketAlignmentMain({ enabled, focusEventId });

  const onOpen = useCallback(
    async (resolved: MarketAlignmentOffer) => {
      onFocusMatchOffer?.(resolved);

      if (resolved.handshakeId && resolved.viewerAction === "accept_listing") {
        if (actionBusy) {
          return;
        }
        setActionBusy(true);
        try {
          const accepted = await acceptMarketHandshakeRemote({
            handshakeId: resolved.handshakeId,
          });
          toast.success(copy.globe.marketHandshakeListingAcceptedToast);
          router.push(peerRoomPath(accepted.threadId));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : copy.globe.marketAlignBridgeFail;
          toast.error(message);
        } finally {
          setActionBusy(false);
        }
        return;
      }

      if (
        resolved.threadId &&
        (resolved.viewerAction === "open_preview" || resolved.viewerAction === "open_chat")
      ) {
        router.push(peerRoomPath(resolved.threadId));
        return;
      }

      if (onFocusMatchEvent) {
        onFocusMatchEvent(resolved.matchEventId);
        return;
      }

      const place = resolved.matchPlaceLabel || "만남 장소";
      openHrefWithFallback(
        buildKakaoMapRouteHref({
          lat: resolved.matchLat,
          lng: resolved.matchLng,
          placeLabel: place,
        }),
        buildKakaoMapRouteWebHref({
          lat: resolved.matchLat,
          lng: resolved.matchLng,
          placeLabel: place,
        }),
      );
    },
    [actionBusy, onFocusMatchEvent, onFocusMatchOffer, router],
  );

  if (!enabled || !offer) {
    return null;
  }

  return (
    <MarketAlignmentMainCard
      className={className}
      offer={offer}
      loading={false}
      onOpen={onOpen}
      onDismiss={dismiss}
    />
  );
}
