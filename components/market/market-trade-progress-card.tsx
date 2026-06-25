"use client";

import { useState } from "react";
import { Calendar, Car, Check, ImageIcon, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { MarketListingMediaRowThumb } from "@/components/market/market-listing-media-thumb";
import { useCopy } from "@/hooks/use-copy";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import {
  confirmMarketTradeScheduleRemote,
  departMarketTradeRemote,
  proposeMarketTradePreferredRemote,
} from "@/lib/globe/market/client/fetch-market-trades-client";
import { formatMarketTradeMeetAtLabel } from "@/lib/globe/market/resolve-market-trade-progress";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import {
  buildKakaoMapRouteHref,
  buildKakaoMapRouteWebHref,
} from "@/lib/resolvers/deep-links";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import { cn } from "@/lib/utils";

export type MarketTradeProgressCardProps = {
  session: MarketTradeSessionView;
  onUpdated?: (session: MarketTradeSessionView) => void;
  className?: string;
};

function StepIcon({ stepId, state }: { stepId: string; state: string }) {
  const active = state === "active";
  const done = state === "done";
  const base = cn(
    "flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold",
    done && "border-[#22c55e] bg-[#22c55e] text-white",
    active && "border-[#22c55e] bg-white text-[#22c55e]",
    !done && !active && "border-[#e5e8eb] bg-white text-[#b0b8c1]",
  );
  if (stepId === "before_departure" && (active || done)) {
    return (
      <span className={base} aria-hidden>
        <Car className="size-3.5" />
      </span>
    );
  }
  if (done || (active && stepId === "done")) {
    return (
      <span className={base} aria-hidden>
        <Check className="size-3.5" />
      </span>
    );
  }
  return <span className={base} aria-hidden />;
}

export function MarketTradeProgressCard({
  session,
  onUpdated,
  className,
}: MarketTradeProgressCardProps) {
  const copy = useCopy();
  const globe = copy.globe;
  const liveLocation = useLiveLocationSnapshot();
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [departBusy, setDepartBusy] = useState(false);
  const isSeeking = session.viewerRole === "seeking";
  const badgeTone = isSeeking
    ? "bg-[#7c3aed] text-white"
    : "bg-[#3182f6] text-white";

  const onNavigate = () => {
    if (session.meetLat != null && session.meetLng != null) {
      const href = buildKakaoMapRouteHref({
        lat: session.meetLat,
        lng: session.meetLng,
        placeLabel: session.meetPlaceDisplay,
      });
      const webHref = buildKakaoMapRouteWebHref({
        lat: session.meetLat,
        lng: session.meetLng,
        placeLabel: session.meetPlaceDisplay,
      });
      void openHrefWithFallback(href, webHref);
      return;
    }
    if (session.meetPlaceDisplay) {
      const webHref = buildKakaoMapRouteWebHref({
        lat: 0,
        lng: 0,
        placeLabel: session.meetPlaceDisplay,
      });
      window.open(webHref, "_blank", "noopener,noreferrer");
    }
  };

  const onConfirmSlot = async (meetAtIso: string) => {
    if (busySlot) {
      return;
    }
    setBusySlot(meetAtIso);
    try {
      const updated = await confirmMarketTradeScheduleRemote({
        handshakeId: session.handshakeId,
        meetAtIso,
        meetPlaceLabel: session.meetPlaceDisplay ?? undefined,
      });
      if (updated) {
        toast.success(globe.marketTradeConfirmSuccess);
        onUpdated?.(updated);
      }
    } catch {
      toast.error(globe.marketTradeConfirmFail);
    } finally {
      setBusySlot(null);
    }
  };

  const onProposePreferred = async (meetAtIso: string) => {
    if (busySlot) {
      return;
    }
    setBusySlot(meetAtIso);
    try {
      const updated = await proposeMarketTradePreferredRemote({
        handshakeId: session.handshakeId,
        meetAtIso,
      });
      if (updated) {
        toast.success(globe.marketTradeProposePreferredSuccess);
        onUpdated?.(updated);
      }
    } catch {
      toast.error(globe.marketTradeProposePreferredFail);
    } finally {
      setBusySlot(null);
    }
  };

  const onDepart = async () => {
    if (departBusy) {
      return;
    }
    const lat = liveLocation?.lat;
    const lng = liveLocation?.lng;
    if (lat == null || lng == null) {
      toast.error(globe.marketTradeLocationNeeded);
      return;
    }
    setDepartBusy(true);
    try {
      const updated = await departMarketTradeRemote({
        handshakeId: session.handshakeId,
        lat,
        lng,
      });
      if (updated) {
        toast.success(globe.marketTradeDepartSuccess);
        onUpdated?.(updated);
      }
    } catch {
      toast.error(globe.marketTradeDepartFail);
    } finally {
      setDepartBusy(false);
    }
  };

  const showProgress =
    session.tradeStatus === "confirmed" ||
    session.tradeStatus === "en_route" ||
    session.tradeStatus === "meeting" ||
    session.activeStepId !== "confirmed";

  return (
    <article
      className={cn(
        "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]",
        className,
      )}
      data-market-trade-card={session.handshakeId}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", badgeTone)}>
          {session.roleBadgeKo}
        </span>
        <div className="text-right">
          <p className="text-[13px] font-semibold text-[#191f28]">{session.statusHeadlineKo}</p>
          {session.statusSublineKo ? (
            <p className="mt-0.5 text-[12px] text-[#6b7684]">{session.statusSublineKo}</p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#f2f4f6]">
          {session.photoUrl ? (
            <MarketListingMediaRowThumb photoUrl={session.photoUrl} videoUrl={null} />
          ) : (
            <div className="flex size-full items-center justify-center text-[#b0b8c1]">
              <ImageIcon className="size-6" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-[#191f28]">{session.productTitle}</p>
          <p className="mt-0.5 text-[15px] font-semibold text-[#191f28]">{session.priceLine}</p>
        </div>
      </div>

      {session.tradeStatus === "scheduling" && session.viewerRole === "listing" ? (
        <div className="mt-3 space-y-2 rounded-xl bg-[#f8f9fb] px-3 py-3">
          <p className="text-[13px] font-medium text-[#191f28]">{globe.marketTradePickScheduleSlot}</p>
          {session.proposalLineKo ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#3182f6]">
              <Calendar className="size-3.5 shrink-0" aria-hidden />
              {session.proposalLineKo}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {session.scheduleCandidates.map((slot) => {
              const isPreferred = session.preferredMeetAtIso === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={busySlot !== null}
                  onClick={() => void onConfirmSlot(slot)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50",
                    isPreferred
                      ? "bg-[#3182f6] ring-2 ring-[#3182f6] ring-offset-1"
                      : "bg-[#3182f6]",
                  )}
                >
                  {busySlot === slot ? "…" : formatMarketTradeMeetAtLabel(slot)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {session.showProposePreferred ? (
        <div className="mt-3 space-y-2 rounded-xl bg-[#f8f9fb] px-3 py-3">
          <p className="text-[13px] text-[#4e5968]">{globe.marketTradeStatusSchedulingSeekingSub}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {session.scheduleCandidates.map((slot) => {
              const isPreferred = session.preferredMeetAtIso === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={busySlot !== null}
                  onClick={() => void onProposePreferred(slot)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50",
                    isPreferred
                      ? "border-[#3182f6] bg-[#eff6ff] text-[#3182f6]"
                      : "border-[#e5e8eb] bg-white text-[#191f28]",
                  )}
                >
                  {busySlot === slot ? "…" : globe.marketTradeProposePreferred}
                  {" · "}
                  {formatMarketTradeMeetAtLabel(slot)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {session.meetAtLabelKo ? (
        <p className="mt-3 flex items-center gap-2 text-[14px] text-[#191f28]">
          <Calendar className="size-4 shrink-0 text-[#3182f6]" aria-hidden />
          {session.meetAtLabelKo}
        </p>
      ) : null}

      {session.meetPlaceDisplay ? (
        <p className="mt-1.5 flex items-center gap-2 text-[14px] text-[#191f28]">
          <MapPin className="size-4 shrink-0 text-[#3182f6]" aria-hidden />
          {session.meetPlaceDisplay}
        </p>
      ) : null}

      {session.hostGuestEtaLabelKo ? (
        <p className="mt-2 flex items-center gap-2 text-[13px] font-medium text-[#3182f6]">
          <Car className="size-3.5 shrink-0" aria-hidden />
          {session.hostGuestEtaLabelKo}
        </p>
      ) : null}

      {showProgress && session.tradeStatus !== "scheduling" ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-1">
            {session.progressSteps.map((step, index) => (
              <div key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <StepIcon stepId={step.id} state={step.state} />
                <span
                  className={cn(
                    "truncate text-center text-[10px] font-medium",
                    step.state === "active" ? "text-[#22c55e]" : "text-[#8b95a1]",
                  )}
                >
                  {step.labelKo}
                </span>
                {index < session.progressSteps.length - 1 ? (
                  <span
                    className={cn(
                      "absolute hidden",
                    )}
                    aria-hidden
                  />
                ) : null}
              </div>
            ))}
          </div>
          <div className="relative mt-1 h-0.5 rounded-full bg-[#e5e8eb]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#22c55e] transition-all"
              style={{
                width: `${Math.max(25, (session.progressSteps.findIndex((s) => s.state === "active") + 1) * 25)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {(session.showNavigate || session.showDepart || session.isEnRoute) && (
        <div className="mt-4 flex gap-2">
          {session.showNavigate ? (
            <button
              type="button"
              onClick={onNavigate}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#f2f4f6] py-2.5 text-[14px] font-semibold text-[#191f28]"
            >
              <Navigation className="size-4" aria-hidden />
              {globe.marketTradeNavigate}
            </button>
          ) : null}
          {session.showDepart ? (
            <button
              type="button"
              disabled={departBusy}
              onClick={() => void onDepart()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#22c55e] py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              <Car className="size-4" aria-hidden />
              {departBusy ? "…" : globe.marketTradeDepart}
            </button>
          ) : null}
          {session.isEnRoute && session.viewerRole === "seeking" ? (
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#ecfdf3] py-2.5 text-[14px] font-semibold text-[#16a34a]">
              <Car className="size-4" aria-hidden />
              {globe.marketTradeEnRoute}
            </span>
          ) : null}
        </div>
      )}
    </article>
  );
}
