"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble } from "lucide-react";
import { toast } from "sonner";
import { GlobeExpressCheckoutSheet } from "@/components/globe/globe-express-checkout-sheet";
import { GlobeHubCheckoutSheet } from "@/components/globe/globe-hub-checkout-sheet";
import { GlobeLodgingRoomOfferCard } from "@/components/globe/lodging/globe-lodging-booking-ui";
import { copy } from "@/lib/copy/human-ko";
import {
  prepareLodgingHubCheckout,
  type HubLodgingCheckoutSession,
} from "@/lib/globe/hub-checkout";
import type { LodgingResourcePayload } from "@/lib/globe/context-hub/lodging-resource-types";
import { openIdentityVaultSettings } from "@/lib/identity-vault/open-identity-vault-settings-bridge";
import { readIdentityVaultBundleClient } from "@/lib/identity-vault/read-identity-vault-bundle-client";
import { assessExpressCheckoutReadiness } from "@/lib/payment-vault/assess-express-checkout-readiness";
import { openPaymentVaultSettings } from "@/lib/payment-vault/open-payment-vault-settings-bridge";
import { readPaymentVaultBundleClient } from "@/lib/payment-vault/read-payment-vault-bundle-client";
import type { ExpressCheckoutReadiness } from "@/lib/payment-vault/types";
import { resolveLodgingOfferCoverUrl } from "@/lib/globe/context-hub/providers/liteapi/attach-liteapi-room-offer-images";
import { cn } from "@/lib/utils";

export type GlobeLodgingRoomCardListProps = {
  contextEventId: string;
  resourceId: string;
  payload: LodgingResourcePayload;
  className?: string;
  onOpenIdentitySettings?: () => void;
  onOpenPaymentSettings?: () => void;
};

function formatKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function pickRecommendedOfferId(
  offers: NonNullable<LodgingResourcePayload["roomOffers"]>,
): string | null {
  const sorted = [...offers].sort((a, b) => {
    const aPrice = a.totalPriceKrw ?? a.priceKrw ?? Number.POSITIVE_INFINITY;
    const bPrice = b.totalPriceKrw ?? b.priceKrw ?? Number.POSITIVE_INFINITY;
    return aPrice - bPrice;
  });
  const refundable = sorted.find((row) => row.refundable);
  return (refundable ?? sorted[0])?.id ?? null;
}

function buildCheckoutSession(
  contextEventId: string,
  resourceId: string,
  payload: LodgingResourcePayload,
  offer: NonNullable<LodgingResourcePayload["roomOffers"]>[number],
): HubLodgingCheckoutSession | null {
  return prepareLodgingHubCheckout({
    contextEventId,
    resourceId,
    payload,
    offer: {
      id: offer.id,
      title: offer.title,
      occupancyLabelKo: offer.occupancyLabelKo,
      totalPriceKrw: offer.totalPriceKrw ?? null,
      priceKrw: offer.priceKrw ?? null,
      guestCount: offer.guestCount,
      refundable: offer.refundable,
      sourceLabelKo: offer.sourceLabelKo,
      providerOfferId: offer.providerOfferId ?? null,
    },
    offerImages: offer.imageUrls,
  });
}

/** Room cards → express one-tap or standard Hub checkout. */
export function GlobeLodgingRoomCardList({
  contextEventId,
  resourceId,
  payload,
  className,
  onOpenIdentitySettings,
  onOpenPaymentSettings,
}: GlobeLodgingRoomCardListProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [expressOpen, setExpressOpen] = useState(false);
  const [checkoutSession, setCheckoutSession] =
    useState<HubLodgingCheckoutSession | null>(null);
  const [expressReadiness, setExpressReadiness] =
    useState<ExpressCheckoutReadiness | null>(null);

  const offers = payload.roomOffers ?? [];
  const isLiveRate = payload.provider === "liteapi";
  const recommendedId = useMemo(() => pickRecommendedOfferId(offers), [offers]);
  const heroImage = payload.images[0] ?? null;
  const hintCopy = isLiveRate
    ? copy.globe.lodgingRoomCardHint
    : offers.length > 0
      ? copy.globe.lodgingRoomCardHintEstimate
      : copy.globe.lodgingRoomCardHint;

  const refreshExpressReadiness = useCallback(async () => {
    const [identityBundle, paymentBundle] = await Promise.all([
      readIdentityVaultBundleClient(),
      readPaymentVaultBundleClient(),
    ]);
    setExpressReadiness(
      assessExpressCheckoutReadiness({
        hubId: "lodging",
        identityBundle,
        paymentBundle,
      }),
    );
  }, []);

  useEffect(() => {
    void refreshExpressReadiness();
  }, [refreshExpressReadiness]);

  if (offers.length === 0) {
    if (payload.provider !== "liteapi") {
      return null;
    }
    return (
      <section
        className={cn(
          "overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-white to-[#f7f7fa] p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.05]",
          className,
        )}
      >
        <p className="text-[15px] font-bold tracking-tight text-[#1d1d1f]">
          {copy.globe.lodgingRoomCardTitle}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6e6e73]">
          {copy.globe.lodgingRoomCardEmptyLive}
        </p>
      </section>
    );
  }

  const expressReady = expressReadiness?.ready === true;

  const openStandardCheckout = (
    offer: NonNullable<LodgingResourcePayload["roomOffers"]>[number],
  ) => {
    setSelectedOfferId(offer.id);
    const session = buildCheckoutSession(contextEventId, resourceId, payload, offer);
    if (!session) {
      toast.message(copy.hubCheckout.invalidAmount);
      return;
    }
    setCheckoutSession(session);
    setExpressOpen(false);
    setCheckoutOpen(true);
  };

  const openExpressCheckout = (
    offer: NonNullable<LodgingResourcePayload["roomOffers"]>[number],
  ) => {
    setBusyId(offer.id);
    setSelectedOfferId(offer.id);
    const session = buildCheckoutSession(contextEventId, resourceId, payload, offer);
    setBusyId(null);
    if (!session) {
      toast.message(copy.hubCheckout.invalidAmount);
      return;
    }
    setCheckoutSession(session);
    setCheckoutOpen(false);
    setExpressOpen(true);
  };

  return (
    <>
      <section
        className={cn(
          "overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-white to-[#f7f7fa] p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.05]",
          className,
        )}
      >
        <div className="mb-3 flex items-start gap-3">
          {heroImage ? (
            <div className="size-12 shrink-0 overflow-hidden rounded-2xl bg-[#ececf0] shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt="" className="size-full object-cover" draggable={false} />
            </div>
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#0071e3]">
              <BedDouble className="size-5" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight text-[#1d1d1f]">
              {copy.globe.lodgingRoomCardTitle}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#6e6e73]">
              {expressReady ? copy.hubCheckout.expressHint : hintCopy}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {offers.map((offer, index) => {
            const priceLine = formatKrw(offer.totalPriceKrw ?? offer.priceKrw);
            const amount = offer.totalPriceKrw ?? offer.priceKrw;
            const coverImageUrl = resolveLodgingOfferCoverUrl({
              offer,
              propertyImages: payload.images,
            });
            const expressLabel =
              amount != null && Number.isFinite(amount)
                ? copy.hubCheckout.expressPay(
                    `${Math.round(amount).toLocaleString("ko-KR")}원`,
                  )
                : copy.hubCheckout.expressTitle;

            return (
              <GlobeLodgingRoomOfferCard
                key={offer.id}
                index={index}
                title={offer.title}
                occupancyLabel={offer.occupancyLabelKo}
                priceLine={priceLine}
                coverImageUrl={coverImageUrl}
                roomPhoto={Boolean(offer.imageUrls?.length)}
                refundable={offer.refundable}
                sourceLabel={offer.sourceLabelKo}
                recommended={offer.id === recommendedId}
                liveRate={isLiveRate}
                selected={selectedOfferId === offer.id && (checkoutOpen || expressOpen)}
                busy={busyId === offer.id}
                expressReady={expressReady}
                expressCtaLabel={expressLabel}
                ctaLabel={copy.globe.lodgingRoomCardSelect}
                onExpressSelect={() => openExpressCheckout(offer)}
                onSelect={() => openStandardCheckout(offer)}
              />
            );
          })}
        </div>
      </section>

      <GlobeExpressCheckoutSheet
        open={expressOpen}
        session={checkoutSession}
        onOpenChange={(next) => {
          setExpressOpen(next);
          if (!next) {
            setSelectedOfferId(null);
          }
        }}
        onOpenIdentitySettings={onOpenIdentitySettings ?? openIdentityVaultSettings}
        onOpenPaymentSettings={onOpenPaymentSettings ?? openPaymentVaultSettings}
        onUseStandardCheckout={() => {
          if (!checkoutSession) {
            return;
          }
          setExpressOpen(false);
          setCheckoutOpen(true);
        }}
        onComplete={() => {
          toast.success(copy.globe.lodgingRoomCardReserveDone);
          void refreshExpressReadiness();
        }}
      />

      <GlobeHubCheckoutSheet
        open={checkoutOpen}
        session={checkoutSession}
        onOpenChange={(next) => {
          setCheckoutOpen(next);
          if (!next) {
            setSelectedOfferId(null);
          }
        }}
        onOpenIdentitySettings={onOpenIdentitySettings ?? openIdentityVaultSettings}
        onComplete={() => {
          toast.success(copy.globe.lodgingRoomCardReserveDone);
          void refreshExpressReadiness();
        }}
      />
    </>
  );
}
