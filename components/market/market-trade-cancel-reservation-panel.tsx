"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { cancelMarketTradeReservationRemote } from "@/lib/globe/market/client/fetch-market-trades-client";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { cn } from "@/lib/utils";

export type MarketTradeCancelReservationPanelProps = {
  session: MarketTradeSessionView;
  onUpdated?: (session: MarketTradeSessionView) => void;
  onCancelled?: () => void;
  className?: string;
};

export function MarketTradeCancelReservationPanel({
  session,
  onUpdated,
  onCancelled,
  className,
}: MarketTradeCancelReservationPanelProps) {
  const copy = useCopy();
  const globe = copy.globe;
  const [open, setOpen] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session.showCancelReservation) {
    return null;
  }

  const onConfirmCancel = async () => {
    if (!selectedReasonId || busy) {
      return;
    }
    setBusy(true);
    try {
      const updated = await cancelMarketTradeReservationRemote({
        handshakeId: session.handshakeId,
        reasonId: selectedReasonId,
      });
      toast.success(globe.marketTradeCancelSuccess);
      if (updated) {
        onUpdated?.(updated);
      }
      onCancelled?.();
      setOpen(false);
      setSelectedReasonId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : globe.marketTradeCancelFail;
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className={cn("mt-4 border-t border-black/[0.06] pt-3", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-[#fff1f2] py-2.5 text-[14px] font-semibold text-[#e11d48]"
        >
          {globe.marketTradeCancelCta}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("mt-4 space-y-3 rounded-xl bg-[#fff8f8] px-3 py-3", className)}>
      <p className="text-[13px] font-semibold text-[#191f28]">{globe.marketTradeCancelTitle}</p>
      <p className="text-[12px] text-[#6b7684]">{globe.marketTradeCancelHint}</p>
      <div className="grid grid-cols-2 gap-2">
        {session.cancelReasons.map((reason) => {
          const selected = selectedReasonId === reason.id;
          return (
            <button
              key={reason.id}
              type="button"
              disabled={busy}
              onClick={() => setSelectedReasonId(reason.id)}
              className={cn(
                "rounded-xl px-3 py-3 text-left text-[13px] font-medium leading-snug",
                selected
                  ? "bg-[#e11d48] text-white shadow-sm"
                  : "bg-white text-[#191f28] ring-1 ring-[#fecdd3]",
              )}
            >
              {reason.labelKo}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setSelectedReasonId(null);
          }}
          className="flex-1 rounded-xl bg-[#f2f4f6] py-2.5 text-[14px] font-semibold text-[#191f28] disabled:opacity-50"
        >
          {globe.marketTradeCancelDismiss}
        </button>
        <button
          type="button"
          disabled={!selectedReasonId || busy}
          onClick={() => void onConfirmCancel()}
          className="flex-1 rounded-xl bg-[#e11d48] py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? "…" : globe.marketTradeCancelConfirm}
        </button>
      </div>
    </div>
  );
}
