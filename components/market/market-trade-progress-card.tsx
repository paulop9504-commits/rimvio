"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Car, Check, ImageIcon, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { MarketCompletionTraceSheet } from "@/components/market/market-completion-trace-sheet";
import { MarketTradeCancelReservationPanel } from "@/components/market/market-trade-cancel-reservation-panel";
import { MarketListingMediaRowThumb } from "@/components/market/market-listing-media-thumb";
import { useCopy } from "@/hooks/use-copy";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import {
  acceptMarketTradeScheduleRemote,
  departMarketTradeRemote,
  pickMarketTradeDayRemote,
  proposeMarketTradeScheduleRemote,
} from "@/lib/globe/market/client/fetch-market-trades-client";
import { confirmMarketHandshakeCompleteRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import { commitMarketCompletionTrace } from "@/lib/globe/market/commit-market-completion-trace";
import { dismissMarketCompletionTrace } from "@/lib/globe/market/market-completion-pinned-store";
import type { MarketCompletionTraceDraft } from "@/lib/globe/market/market-handshake-types";
import {
  buildMarketTradeMeetAtIsoFromParts,
  formatMarketTradeDateLabelKo,
  isMeetTimeAllowedForTrade,
  suggestMarketTradeProposeTimeValue,
} from "@/lib/globe/market/market-trade-schedule";
import { formatMarketTradeMeetAtLabel } from "@/lib/globe/market/resolve-market-trade-progress";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import {
  buildKakaoMapRouteHref,
  buildKakaoMapRouteWebHref,
} from "@/lib/resolvers/deep-links";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import { rimvioCompactPrimaryCtaClass } from "@/lib/design/rimvio-ontology";
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
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [departBusy, setDepartBusy] = useState(false);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [proposePlace, setProposePlace] = useState(session.meetPlaceDisplay ?? "");
  const [proposeTimeValue, setProposeTimeValue] = useState("");
  const [completionTrace, setCompletionTrace] = useState<MarketCompletionTraceDraft | null>(null);
  const [completionSheetOpen, setCompletionSheetOpen] = useState(false);
  const [completionPinBusy, setCompletionPinBusy] = useState(false);

  const isSeeking = session.viewerRole === "seeking";
  const badgeTone = isSeeking ? "bg-[#7c3aed] text-white" : "bg-[#3182f6] text-white";

  useEffect(() => {
    const dateKey = session.preferredMeetDateKey?.trim();
    if (!dateKey || !session.showProposeSchedule) {
      return;
    }
    setProposeTimeValue(suggestMarketTradeProposeTimeValue(dateKey));
  }, [session.handshakeId, session.preferredMeetDateKey, session.showProposeSchedule]);

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

  const onPickDay = async (dateKey: string) => {
    if (busyKey) {
      return;
    }
    setBusyKey(dateKey);
    try {
      const updated = await pickMarketTradeDayRemote({
        handshakeId: session.handshakeId,
        dateKey,
      });
      if (updated) {
        toast.success(globe.marketTradePickDaySuccess);
        onUpdated?.(updated);
      }
    } catch {
      toast.error(globe.marketTradePickDayFail);
    } finally {
      setBusyKey(null);
    }
  };

  const onProposeSchedule = async () => {
    const dateKey = session.preferredMeetDateKey?.trim();
    if (!dateKey || !proposeTimeValue || busyKey) {
      return;
    }
    const meetAtIso = buildMarketTradeMeetAtIsoFromParts(dateKey, proposeTimeValue);
    if (
      !meetAtIso ||
      !isMeetTimeAllowedForTrade({
        meetAtIso,
        dateKey,
      })
    ) {
      toast.error(globe.marketTradeProposeTimeInvalid);
      return;
    }
    setBusyKey(meetAtIso);
    try {
      const updated = await proposeMarketTradeScheduleRemote({
        handshakeId: session.handshakeId,
        meetAtIso,
        meetPlaceLabel: proposePlace.trim() || session.meetPlaceDisplay || undefined,
      });
      if (updated) {
        toast.success(globe.marketTradeProposeSuccess);
        onUpdated?.(updated);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : globe.marketTradeProposeFail,
      );
    } finally {
      setBusyKey(null);
    }
  };

  const onAcceptSchedule = async () => {
    if (busyKey) {
      return;
    }
    setBusyKey("accept");
    try {
      const updated = await acceptMarketTradeScheduleRemote({
        handshakeId: session.handshakeId,
      });
      if (updated) {
        toast.success(globe.marketTradeAcceptSuccess);
        onUpdated?.(updated);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : globe.marketTradeAcceptFail,
      );
    } finally {
      setBusyKey(null);
    }
  };

  const onDepart = async () => {
    if (departBusy || !session.canDepart) {
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

  const onConfirmHandshakeComplete = useCallback(async () => {
    if (completeBusy) {
      return;
    }
    setCompleteBusy(true);
    try {
      const result = await confirmMarketHandshakeCompleteRemote({
        handshakeId: session.handshakeId,
      });
      if (result.awaitingOtherParty) {
        toast.success(globe.marketHandshakeCompleteAwaitingToast);
      } else {
        toast.success(globe.marketHandshakeCompleteConfirmedToast);
      }
      if (result.completed && result.trace) {
        setCompletionTrace(result.trace);
        setCompletionSheetOpen(true);
      }
      if (result.completed) {
        onUpdated?.({
          ...session,
          phase: "completed",
          tradeStatus: "completed",
          canConfirmHandshakeComplete: false,
          awaitingHandshakeOtherParty: false,
        });
      } else {
        onUpdated?.({
          ...session,
          canConfirmHandshakeComplete: false,
          awaitingHandshakeOtherParty: true,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : globe.marketHandshakeCompleteFail;
      toast.error(message);
    } finally {
      setCompleteBusy(false);
    }
  }, [
    completeBusy,
    globe.marketHandshakeCompleteAwaitingToast,
    globe.marketHandshakeCompleteConfirmedToast,
    globe.marketHandshakeCompleteFail,
    onUpdated,
    session,
  ]);

  const onPinCompletionTrace = async () => {
    if (!completionTrace || completionPinBusy) {
      return;
    }
    setCompletionPinBusy(true);
    try {
      commitMarketCompletionTrace({
        trace: completionTrace,
        threadId: session.threadId,
      });
      setCompletionSheetOpen(false);
      toast.success(globe.marketCompletionTracePinnedToast);
    } finally {
      setCompletionPinBusy(false);
    }
  };

  const onDismissCompletionTrace = () => {
    if (completionTrace) {
      dismissMarketCompletionTrace(completionTrace.handshakeId);
    }
    setCompletionSheetOpen(false);
  };

  const showProgress =
    session.tradeStatus === "confirmed" ||
    session.tradeStatus === "en_route" ||
    session.tradeStatus === "meeting" ||
    session.activeStepId !== "confirmed";

  const schedulingActive =
    session.tradeStatus === "scheduling" ||
    session.tradeStatus === "buyer_picked_day" ||
    session.tradeStatus === "seller_proposed";

  return (
    <>
      <article
        className={cn(
          "rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/[0.05]",
          className,
        )}
        data-market-trade-card={session.handshakeId}
      >
        <div className="mb-2.5 flex items-start justify-between gap-3">
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

        <div className="flex gap-2.5">
          <div className="relative size-[52px] shrink-0 overflow-hidden rounded-xl bg-[#f2f4f6]">
            {session.photoUrl ? (
              <MarketListingMediaRowThumb
                photoUrl={session.photoUrl}
                videoUrl={session.videoUrl}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[#b0b8c1]">
                <ImageIcon className="size-6" aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-[#191f28]">{session.productTitle}</p>
            <p className="mt-0.5 text-[14px] font-semibold text-[#191f28]">{session.priceLine}</p>
          </div>
        </div>

        {session.showPickDay ? (
          <div className="mt-3 space-y-2 rounded-xl bg-[#f8f9fb] px-3 py-3">
            <p className="text-[13px] font-medium text-[#191f28]">{globe.marketTradePickDayTitle}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {session.scheduleCandidates.map((dateKey) => (
                <button
                  key={dateKey}
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => void onPickDay(dateKey)}
                  className="rounded-full bg-[#7c3aed] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {busyKey === dateKey ? "…" : formatMarketTradeDateLabelKo(dateKey)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {session.showProposeSchedule ? (
          <div className="mt-3 space-y-3 rounded-xl bg-[#f8f9fb] px-3 py-3">
            <p className="text-[13px] font-medium text-[#191f28]">
              {globe.marketTradeProposeScheduleTitle}
            </p>
            {session.preferredMeetDateKey ? (
              <p className="text-[12px] font-semibold text-[#3182f6]">
                {formatMarketTradeDateLabelKo(session.preferredMeetDateKey)}
              </p>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-[#6b7684]">
                {globe.marketTradeProposeTimeLabel}
              </span>
              <input
                type="time"
                step={60}
                value={proposeTimeValue}
                onChange={(event) => setProposeTimeValue(event.target.value)}
                className="w-full rounded-xl border border-[#e5e8eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#3182f6]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-[#6b7684]">
                {globe.marketTradeProposePlaceLabel}
              </span>
              <input
                type="text"
                value={proposePlace}
                onChange={(event) => setProposePlace(event.target.value)}
                placeholder={globe.marketTradeProposePlacePlaceholder}
                className="w-full rounded-xl border border-[#e5e8eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#3182f6]"
              />
            </label>
            <button
              type="button"
              disabled={!proposeTimeValue || busyKey !== null}
              onClick={() => void onProposeSchedule()}
              className={cn(rimvioCompactPrimaryCtaClass(), "w-full disabled:opacity-50")}
            >
              {busyKey ? "…" : globe.marketTradeProposeSend}
            </button>
          </div>
        ) : null}

        {session.showAcceptProposal ? (
          <div className="mt-3 space-y-3 rounded-xl bg-[#f8f9fb] px-3 py-3">
            {session.meetAtLabelKo ? (
              <p className="flex items-center gap-2 text-[14px] font-semibold text-[#191f28]">
                <Calendar className="size-4 text-[#3182f6]" aria-hidden />
                {session.meetAtLabelKo}
              </p>
            ) : null}
            {session.meetPlaceDisplay ? (
              <p className="flex items-center gap-2 text-[14px] text-[#191f28]">
                <MapPin className="size-4 text-[#3182f6]" aria-hidden />
                {session.meetPlaceDisplay}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() => void onAcceptSchedule()}
              className={cn(rimvioCompactPrimaryCtaClass(), "w-full disabled:opacity-50")}
            >
              {busyKey ? "…" : globe.marketTradeAcceptSchedule}
            </button>
          </div>
        ) : null}

        {!schedulingActive && session.meetAtLabelKo ? (
          <p className="mt-3 flex items-center gap-2 text-[14px] text-[#191f28]">
            <Calendar className="size-4 shrink-0 text-[#3182f6]" aria-hidden />
            {session.meetAtLabelKo}
          </p>
        ) : null}

        {!schedulingActive && session.meetPlaceDisplay ? (
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

        {showProgress && !schedulingActive ? (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-1">
              {session.progressSteps.map((step) => (
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
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
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
                  disabled={!session.canDepart || departBusy}
                  onClick={() => void onDepart()}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[14px] font-semibold disabled:opacity-50",
                    session.canDepart
                      ? "bg-[#22c55e] text-white"
                      : "cursor-not-allowed bg-[#f2f4f6] text-[#b0b8c1]",
                  )}
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
              {session.isEnRoute && session.viewerRole === "listing" ? (
                <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#eff6ff] py-2.5 text-[14px] font-semibold text-[#2563eb]">
                  <Car className="size-4" aria-hidden />
                  {globe.marketTradeGuestEnRouteListing}
                </span>
              ) : null}
            </div>
            {session.departOpensHintKo ? (
              <p className="text-[12px] leading-relaxed text-[#6b7684]">
                {session.departOpensHintKo}
              </p>
            ) : null}
          </div>
        )}

        <MarketTradeCancelReservationPanel
          session={session}
          onUpdated={onUpdated}
          onCancelled={() => {
            onUpdated?.({
              ...session,
              tradeStatus: "cancelled",
              showCancelReservation: false,
            });
          }}
        />

        {session.canConfirmHandshakeComplete || session.awaitingHandshakeOtherParty ? (
          <div className="mt-4 border-t border-black/[0.06] pt-3">
            {session.awaitingHandshakeOtherParty ? (
              <p className="text-center text-[13px] text-[#6b7684]">
                {globe.marketHandshakeAwaitingOtherParty}
              </p>
            ) : (
              <button
                type="button"
                disabled={completeBusy || !session.canConfirmHandshakeComplete}
                onClick={() => void onConfirmHandshakeComplete()}
                className={cn(rimvioCompactPrimaryCtaClass(), "w-full disabled:opacity-50")}
              >
                {session.handshakeCompleteCtaKo}
              </button>
            )}
          </div>
        ) : null}
      </article>

      <MarketCompletionTraceSheet
        trace={completionTrace}
        open={completionSheetOpen}
        busy={completionPinBusy}
        onOpenChange={(open) => {
          if (!open) {
            onDismissCompletionTrace();
            return;
          }
          setCompletionSheetOpen(true);
        }}
        onConfirm={() => void onPinCompletionTrace()}
      />
    </>
  );
}
