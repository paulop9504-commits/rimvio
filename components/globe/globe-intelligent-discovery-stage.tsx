"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { GlobeInfiniteDiscoveryFeedPanel } from "@/components/globe/globe-infinite-discovery-feed-panel";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import {
  readContextConditionPinnedPlaceIds,
  pinContextConditionRecommendation,
} from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { buildGlobeResourceReelItems } from "@/lib/globe/resource-reel/build-globe-resource-reel-items";
import {
  buildInfiniteDiscoveryFeedCards,
  dispatchIntelligentDiscoveryFeedClose,
  subscribeIntelligentDiscoveryActiveCard,
  subscribeIntelligentDiscoveryFeedClose,
  subscribeIntelligentDiscoveryFeedOpen,
  type InfiniteDiscoveryFeedCard,
} from "@/lib/globe/intelligent-pin";
import { readActiveDiscoveryExecution } from "@/lib/globe/discovery-execution/read-active-discovery-execution";
import { readContextAgentComposeThread } from "@/lib/globe/assistant";
import { openLodgingHubCheckout } from "@/lib/globe/hub-checkout/open-lodging-hub-checkout-bridge";
import { dispatchGlobeLodgingFocus } from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import { dispatchGlobeEateryFocus } from "@/lib/globe/eatery/globe-eatery-focus-bridge";
import { enqueuePlacePrepToExecutionInbox } from "@/lib/reality-queue";
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";
import { toast } from "sonner";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import { subscribeEateryRankModeOverride } from "@/lib/globe/eatery/eatery-rank-mode-session-store";
import { copy } from "@/lib/copy/human-ko";
import { subscribeLodgingRankModeOverride } from "@/lib/globe/lodging/lodging-rank-mode-session-store";
import { cn } from "@/lib/utils";

function focusDiscoveryCardOnMap(input: {
  resourceId: string;
  kind: InfiniteDiscoveryFeedCard["kind"];
  carouselIndex: number;
}): void {
  if (input.kind === "lodging") {
    dispatchGlobeLodgingFocus({
      resourceId: input.resourceId,
      carouselIndex: input.carouselIndex,
      source: "discovery_card",
    });
    return;
  }
  dispatchGlobeEateryFocus({
    resourceId: input.resourceId,
    carouselIndex: input.carouselIndex,
    source: "discovery_card",
  });
}

export type GlobeIntelligentDiscoveryStageProps = {
  contextEventId: string | null | undefined;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  className?: string;
};

export function GlobeIntelligentDiscoveryStage({
  contextEventId,
  globeRef,
  className,
}: GlobeIntelligentDiscoveryStageProps) {
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [pinBusyPlaceId, setPinBusyPlaceId] = useState<string | null>(null);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  useEffect(() => {
    const unsubLodging = subscribeLodgingRankModeOverride((contextEventId) => {
      setRevision((value) => value + 1);
      if (openEventId === contextEventId) {
        setActiveResourceId(null);
      }
    });
    const unsubEatery = subscribeEateryRankModeOverride((contextEventId) => {
      setRevision((value) => value + 1);
      if (openEventId === contextEventId) {
        setActiveResourceId(null);
      }
    });
    return () => {
      unsubLodging();
      unsubEatery();
    };
  }, [openEventId]);

  useEffect(() => {
    return subscribeIntelligentDiscoveryFeedOpen((detail) => {
      setOpenEventId(detail.contextEventId);
    });
  }, []);

  useEffect(() => {
    return subscribeIntelligentDiscoveryFeedClose((detail) => {
      setOpenEventId((current) =>
        current === detail.contextEventId ? null : current,
      );
    });
  }, []);

  useEffect(() => {
    return subscribeIntelligentDiscoveryActiveCard((detail) => {
      if (openEventId !== detail.contextEventId) {
        return;
      }
      setActiveResourceId(detail.resourceId);
      focusDiscoveryCardOnMap({
        resourceId: detail.resourceId,
        kind: detail.kind,
        carouselIndex: 0,
      });
      if (
        Number.isFinite(detail.lat) &&
        Number.isFinite(detail.lng)
      ) {
        globeRef?.current?.flyToPin(detail.lat, detail.lng, "street", {
          pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
        });
      }
    });
  }, [globeRef, openEventId]);

  const [liveNowTick, setLiveNowTick] = useState(0);

  useEffect(() => {
    if (!openEventId) {
      return;
    }
    const timer = window.setInterval(() => {
      setLiveNowTick((value) => value + 1);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [openEventId]);

  const activeEvent = useMemo(() => {
    void revision;
    const eventId = openEventId?.trim();
    if (!eventId) {
      return null;
    }
    return findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId);
  }, [openEventId, revision]);

  const reelItems = useMemo(
    () => (activeEvent ? buildGlobeResourceReelItems(activeEvent) : []),
    [activeEvent, revision],
  );

  const cards = useMemo(
    () => {
      if (!activeEvent || reelItems.length === 0) {
        return [];
      }
      const batch = readActiveDiscoveryExecution(activeEvent.id);
      const lastUserLine = [...readContextAgentComposeThread(activeEvent.id)]
        .reverse()
        .find((turn) => turn.role === "user")?.text;
      return buildInfiniteDiscoveryFeedCards({
        event: activeEvent,
        items: reelItems,
        triggerMessage: batch?.triggerMessage?.trim() || lastUserLine || null,
      });
    },
    [activeEvent, reelItems, liveNowTick],
  );

  const pinned = useMemo(() => {
    const byKind = readContextConditionPinnedPlaceIds(activeEvent);
    return new Set(
      [byKind.lodging, byKind.eatery, byKind.activity, byKind.amenity].filter(
        (placeId): placeId is string => Boolean(placeId?.trim()),
      ),
    );
  }, [activeEvent, revision]);

  const dismiss = useCallback(() => {
    if (openEventId) {
      dispatchIntelligentDiscoveryFeedClose(openEventId);
    }
    setOpenEventId(null);
    setActiveResourceId(null);
  }, [openEventId]);

  const handleFixPin = useCallback(
    async (card: InfiniteDiscoveryFeedCard) => {
      if (!activeEvent || pinned.has(card.placeId)) {
        return;
      }
      setPinBusyPlaceId(card.placeId);
      try {
        pinContextConditionRecommendation({
          eventId: activeEvent.id,
          recommendation: {
            kind: card.kind,
            placeId: card.placeId,
            title: card.media.title,
          },
        });
        setRevision((value) => value + 1);
        focusDiscoveryCardOnMap({
          resourceId: card.resourceId,
          kind: card.kind,
          carouselIndex: card.carouselIndex,
        });
        if (Number.isFinite(card.lat) && Number.isFinite(card.lng)) {
          globeRef?.current?.flyToPin(card.lat, card.lng, "street", {
            pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
          });
        }
        // Land on the map pin — dismiss feed so left chrome / map stay readable.
        dismiss();
      } finally {
        setPinBusyPlaceId(null);
      }
    },
    [activeEvent, dismiss, globeRef, pinned],
  );

  const handleCheckout = useCallback(
    (card: InfiniteDiscoveryFeedCard) => {
      if (!activeEvent || card.kind !== "lodging") {
        return;
      }
      openLodgingHubCheckout({
        contextEventId: activeEvent.id,
        placeId: card.placeId,
      });
    },
    [activeEvent],
  );

  const handleAddToExecutionInbox = useCallback(
    (card: InfiniteDiscoveryFeedCard) => {
      if (!activeEvent) {
        return;
      }
      const kind =
        card.kind === "lodging"
          ? "lodging"
          : card.kind === "activity"
            ? "activity"
            : "eatery";
      const reasonLines = card.media.detailReasonLine
        ? card.media.detailReasonLine
            .split(/[·|,]/u)
            .map((part) => part.trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];
      enqueuePlacePrepToExecutionInbox({
        contextEventId: activeEvent.id,
        contextLabelKo: activeEvent.title?.trim() || activeEvent.place?.trim() || null,
        placeId: card.placeId,
        placeName: card.media.title,
        kind,
        partySize: 2,
        reserveAtLabelKo: "19:00",
        budgetWon: kind === "eatery" ? 15_000 : null,
        reasonLinesKo: reasonLines,
        lat: card.lat,
        lng: card.lng,
      });
      toast.message(copy.globe.intelligentPinAddInboxToast(card.media.title));
      openFieldDashboardIngress({ tab: "queue", primaryEventId: activeEvent.id });
    },
    [activeEvent],
  );

  if (!openEventId || cards.length === 0) {
    return (
      <div
        className={cn("pointer-events-none absolute inset-0 z-[21] overflow-hidden", className)}
        aria-hidden
      />
    );
  }

  const areaLabel =
    activeEvent?.place?.trim() ||
    activeEvent?.title?.trim() ||
    copy.globe.resourceReelAreaFallback;

  return (
    <>
      <GlobeInfiniteDiscoveryFeedPanel
        className={className}
        contextEventId={openEventId}
        areaLabel={areaLabel}
        cards={cards}
        pinnedPlaceIds={pinned}
        activeResourceId={activeResourceId}
        onDismiss={dismiss}
        onFixPin={handleFixPin}
        onCheckout={handleCheckout}
        onAddToExecutionInbox={handleAddToExecutionInbox}
        pinBusyPlaceId={pinBusyPlaceId}
      />
    </>
  );
}
