"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MarketAlignmentMainCard } from "@/components/market/market-alignment-main-card";
import { copy } from "@/lib/copy/human-ko";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import { syncMarketIntentRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import { openMarketAlignmentOffer } from "@/lib/globe/market/open-market-alignment-offer";
import {
  findMarketIntentByEventId,
  listActiveMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { patchMarketIntentPrioritySlot } from "@/lib/globe/market/patch-market-intent-priority-slot";
import { resolveMarketAlignmentGapAsk } from "@/lib/globe/market/resolve-market-alignment-gap-ask";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";
import {
  buildKakaoMapRouteHref,
  buildKakaoMapRouteWebHref,
} from "@/lib/resolvers/deep-links";
import { useMarketAlignmentMain } from "@/hooks/use-market-alignment-main";

export type MarketAlignmentSurfaceProps = {
  enabled: boolean;
  focusEventId?: string | null;
  onFocusMatchEvent?: (eventId: string) => void;
  onFocusMatchOffer?: (offer: MarketAlignmentOffer) => void;
  className?: string;
};

/** Field trades tab — full handshake pipeline (accept, gap-fill, peer chat bootstrap). */
export function MarketAlignmentSurface({
  enabled,
  focusEventId,
  onFocusMatchEvent,
  onFocusMatchOffer,
  className,
}: MarketAlignmentSurfaceProps) {
  const router = useRouter();
  const [actionBusy, setActionBusy] = useState(false);
  const [gapBusy, setGapBusy] = useState(false);
  const [gapRevision, setGapRevision] = useState(0);
  const { offer, dismiss } = useMarketAlignmentMain({ enabled, focusEventId });

  const gapAsk = useMemo(() => {
    if (!offer) {
      return null;
    }
    void gapRevision;
    const self =
      findMarketIntentByEventId(offer.selfEventId) ??
      listActiveMarketIntents().find((row) => row.id === offer.selfIntentId) ??
      null;
    const match =
      findMarketIntentByEventId(offer.matchEventId) ??
      listActiveMarketIntents().find((row) => row.id === offer.matchIntentId) ??
      null;
    if (!self || !match) {
      return null;
    }
    return resolveMarketAlignmentGapAsk({
      self,
      match,
      copy: {
        prompt: copy.globe.marketAlignGapPrompt,
      },
    });
  }, [gapRevision, offer]);

  const onGapFill = useCallback(
    async (input: {
      field: import("@/lib/globe/market/market-priority-matrix").MarketPrioritySlotId;
      value: string | number | boolean;
    }) => {
      if (!offer || gapBusy) {
        return;
      }
      setGapBusy(true);
      try {
        const patched = patchMarketIntentPrioritySlot({
          eventId: offer.selfEventId,
          field: input.field,
          value: input.value,
        });
        if (!patched) {
          return;
        }
        await syncMarketIntentRemote(patched);
        setGapRevision((value) => value + 1);
        toast.success(copy.globe.marketAlignGapSaved);
      } catch {
        toast.error(copy.globe.marketAlignBridgeFail);
      } finally {
        setGapBusy(false);
      }
    },
    [gapBusy, offer],
  );

  const onOpen = useCallback(
    async (resolved: MarketAlignmentOffer) => {
      onFocusMatchOffer?.(resolved);

      const handshakeCopy = {
        bridgeFail: copy.globe.marketAlignBridgeFail,
        bridgeToast: copy.globe.marketAlignBridgeToast,
        handshakeListingAcceptedToast: copy.globe.marketHandshakeListingAcceptedToast,
        handshakeSentWaiting: copy.globe.field.handshakeSentWaiting,
        handshakeNoMatch: copy.globe.field.handshakeNoMatch,
      };

      if (
        resolved.handshakeId &&
        (resolved.viewerAction === "accept_listing" ||
          resolved.viewerAction === "open_preview")
      ) {
        if (actionBusy) {
          return;
        }
        setActionBusy(true);
        try {
          await openMarketAlignmentOffer({
            offer: resolved,
            copy: handshakeCopy,
            navigate: (href) => router.push(href),
          });
        } finally {
          setActionBusy(false);
        }
        return;
      }

      if (resolved.threadId && resolved.viewerAction === "open_chat") {
        await openMarketAlignmentOffer({
          offer: resolved,
          copy: handshakeCopy,
          navigate: (href) => router.push(href),
        });
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
      gapAsk={gapAsk}
      gapBusy={gapBusy}
      onGapFill={(input) => void onGapFill(input)}
      onOpen={onOpen}
      onDismiss={dismiss}
    />
  );
}
