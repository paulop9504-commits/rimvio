"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GlobeContextAiOrb } from "@/components/globe/globe-context-ai-orb";
import { GlobeContextTriggerCard } from "@/components/globe/globe-context-trigger-card";
import { GlobeContextTriggerRail } from "@/components/globe/globe-context-trigger-rail";
import { copy } from "@/lib/copy/human-ko";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import {
  acceptMarketHandshakeRemote,
  startMarketHandshakeChatRemote,
  syncMarketIntentRemote,
} from "@/lib/globe/market/client/sync-market-intent-remote";
import {
  findMarketIntentByEventId,
  listActiveMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { patchMarketIntentPrioritySlot } from "@/lib/globe/market/patch-market-intent-priority-slot";
import { readMarketHandshakeUserError } from "@/lib/globe/market/read-market-handshake-user-error";
import { resolveMarketAlignmentGapAsk } from "@/lib/globe/market/resolve-market-alignment-gap-ask";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import {
  buildKakaoMapRouteHref,
  buildKakaoMapRouteWebHref,
} from "@/lib/resolvers/deep-links";
import { peerRoomPath } from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { useGlobeContextTriggers } from "@/hooks/use-globe-context-triggers";
import { useMarketAlignmentMain } from "@/hooks/use-market-alignment-main";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type GlobeContextAiSurfaceProps = {
  enabled: boolean;
  layerMode: GlobeLayerMode;
  focusEventId?: string | null;
  onActivateTrigger: (trigger: GlobeContextTrigger) => void;
  onFocusMatchOffer?: (offer: MarketAlignmentOffer) => void;
  onDiscoveryBrowse?: () => void;
  className?: string;
};

function offerToTrigger(offer: MarketAlignmentOffer): GlobeContextTrigger {
  return {
    id: `trade-${offer.matchIntentId}`,
    kind: "trade_match",
    eventId: offer.matchEventId,
    emoji: "🤝",
    title: offer.headline,
    body: offer.priorityHintKo || offer.body,
    ctaLabel: offer.ctaLabel,
    focused: true,
  };
}

export function GlobeContextAiSurface({
  enabled,
  layerMode,
  focusEventId,
  onActivateTrigger,
  onFocusMatchOffer,
  onDiscoveryBrowse,
  className,
}: GlobeContextAiSurfaceProps) {
  const router = useRouter();
  const [actionBusy, setActionBusy] = useState(false);
  const [gapBusy, setGapBusy] = useState(false);
  const [gapRevision, setGapRevision] = useState(0);

  const recallTriggers = useGlobeContextTriggers({ enabled, layerMode });
  const { offer, dismiss } = useMarketAlignmentMain({
    enabled,
    focusEventId,
  });

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
      copy: { prompt: copy.globe.marketAlignGapPrompt },
    });
  }, [gapRevision, offer]);

  const discoveryBrowseTrigger = useMemo((): GlobeContextTrigger | null => {
    if (layerMode !== "discovery" || offer) {
      return null;
    }
    return {
      id: "discovery-browse",
      kind: "trade_match",
      eventId: null,
      emoji: "🔍",
      title: copy.globe.contextTriggerDiscoveryTitle,
      body: copy.globe.contextTriggerDiscoveryBody,
      ctaLabel: copy.globe.contextTriggerDiscoveryCta,
      focused: true,
    };
  }, [layerMode, offer]);

  const recallRailTriggers = useMemo(() => {
    if (layerMode === "discovery") {
      return [];
    }
    return recallTriggers;
  }, [layerMode, recallTriggers]);

  const heroLine =
    layerMode === "discovery"
      ? copy.globe.contextAiHeroDiscovery
      : copy.globe.contextAiHeroPersonal;

  const openMarketOffer = useCallback(
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
          toast.error(
            readMarketHandshakeUserError(
              error instanceof Error ? error.message : copy.globe.marketAlignBridgeFail,
            ),
          );
        } finally {
          setActionBusy(false);
        }
        return;
      }
      if (resolved.handshakeId && resolved.viewerAction === "open_preview") {
        if (actionBusy) {
          return;
        }
        setActionBusy(true);
        try {
          const started = await startMarketHandshakeChatRemote({
            handshakeId: resolved.handshakeId,
          });
          router.push(peerRoomPath(started.threadId));
        } catch (error) {
          toast.error(
            readMarketHandshakeUserError(
              error instanceof Error ? error.message : copy.globe.marketAlignBridgeFail,
            ),
          );
        } finally {
          setActionBusy(false);
        }
        return;
      }
      if (resolved.threadId && resolved.viewerAction === "open_chat") {
        router.push(peerRoomPath(resolved.threadId));
        return;
      }
      if (resolved.matchEventId) {
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
    [actionBusy, onFocusMatchOffer, router],
  );

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

  const onTriggerPress = useCallback(
    (trigger: GlobeContextTrigger) => {
      if (trigger.id === "discovery-browse") {
        onDiscoveryBrowse?.();
        return;
      }
      if (trigger.kind === "trade_match" && offer) {
        void openMarketOffer(offer);
        return;
      }
      if (trigger.eventId) {
        onActivateTrigger(trigger);
      }
    },
    [offer, onActivateTrigger, onDiscoveryBrowse, openMarketOffer],
  );

  if (!enabled) {
    return null;
  }

  const tradeTrigger = offer ? offerToTrigger(offer) : discoveryBrowseTrigger;
  const showRail = recallRailTriggers.length > 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.35rem] bg-[#070b14]/78 px-3.5 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-xl",
        className,
      )}
      data-globe-context-ai-surface
      data-globe-context-ai-mode={layerMode}
    >
      <div className="flex items-center gap-3">
        <GlobeContextAiOrb className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={cn(RIMVIO_TYPE.headline, "text-[15px] font-semibold text-white")}>
            {heroLine}
          </p>
          <p className={cn("mt-0.5", RIMVIO_TYPE.caption, "text-[12px] text-white/65")}>
            {copy.globe.contextAiHeroHint}
          </p>
        </div>
        {offer ? (
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-white/55 hover:bg-white/10"
            onClick={dismiss}
            aria-label={copy.globe.ingestMenuCloseAria}
          >
            ✕
          </button>
        ) : null}
      </div>

      {tradeTrigger ? (
        <div className="mt-3">
          <GlobeContextTriggerCard
            emoji={tradeTrigger.emoji}
            title={tradeTrigger.title}
            body={tradeTrigger.body}
            ctaLabel={tradeTrigger.ctaLabel}
            mediaPreviews={tradeTrigger.mediaPreviews}
            focused
            onPress={() => {
              if (tradeTrigger.id === "discovery-browse") {
                onDiscoveryBrowse?.();
                return;
              }
              if (offer) {
                void openMarketOffer(offer);
              }
            }}
            footer={
              gapAsk && offer ? (
                <div>
                  <p className={cn(RIMVIO_TYPE.caption, "text-[11px] text-muted-foreground")}>
                    {gapAsk.promptKo}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {gapAsk.chips.map((chip) => (
                      <button
                        key={`${gapAsk.field}-${chip.label}`}
                        type="button"
                        disabled={gapBusy}
                        className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary disabled:opacity-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onGapFill({ field: gapAsk.field, value: chip.value });
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            }
          />
        </div>
      ) : !showRail ? (
        <p className={cn("mt-3 px-0.5", RIMVIO_TYPE.caption, "text-[12px] text-white/55")}>
          {layerMode === "discovery"
            ? copy.globe.layerModeDiscoveryHint
            : copy.globe.layerModePersonalEmpty}
        </p>
      ) : null}

      {showRail ? (
        <div className="mt-3">
          <GlobeContextTriggerRail
            triggers={recallRailTriggers}
            onTriggerPress={onTriggerPress}
          />
        </div>
      ) : null}
    </div>
  );
}
