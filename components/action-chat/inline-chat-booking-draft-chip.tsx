"use client";

import { useMemo, useState } from "react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import type { InlineChatBookingDraftWire } from "@/lib/jarvis-in-app-booking/inline-chat-booking-draft";
import type { BookingLodgingCandidate } from "@/lib/jarvis-in-app-booking/resolve-booking-lodging";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import { cn } from "@/lib/utils";

type InlineChatBookingDraftChipProps = {
  wire: InlineChatBookingDraftWire;
  className?: string;
  onConfirmPrepare?: (messageId?: string) => void;
  onPickLodging?: (candidate: BookingLodgingCandidate) => void;
  busy?: boolean;
};

export function InlineChatBookingDraftChip({
  wire,
  className,
  onConfirmPrepare,
  onPickLodging,
  busy = false,
}: InlineChatBookingDraftChipProps) {
  const [picked, setPicked] = useState<BookingLodgingCandidate | null>(null);

  const activeLodging = useMemo(() => {
    if (picked) {
      return picked;
    }
    if (wire.disambiguation?.length === 1) {
      return wire.disambiguation[0]!;
    }
    return null;
  }, [picked, wire.disambiguation]);

  const displayName = activeLodging?.labelKo ?? wire.placeName;
  const amountLabel = activeLodging?.amountLabel ?? wire.amountLabel;

  const brand = resolveMainActionBrandStyle({
    label: "결재함에 담기",
    deeplink: "",
  });

  if (wire.status === "prepared") {
    return (
      <p className={cn("text-[12px] text-emerald-300/90", className)}>
        결재함에 담았어요 · Field에서 확인하세요.
      </p>
    );
  }

  if (wire.status === "cancelled") {
    return (
      <p className={cn("text-[12px] text-white/45", className)}>예약 준비 취소됨</p>
    );
  }

  if (wire.status === "failed") {
    return (
      <p className={cn("text-[12px] text-red-300/90", className)}>
        {wire.errorKo ?? "예약 준비에 실패했어요"}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {wire.disambiguation && wire.disambiguation.length > 1 && !activeLodging ? (
        <div className="space-y-2">
          <p className="text-[12px] text-white/55">어느 숙소로 예약할까요?</p>
          <div className="flex flex-wrap gap-2">
            {wire.disambiguation.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12px] text-white/85 transition hover:bg-white/10"
                onClick={() => {
                  setPicked(candidate);
                  onPickLodging?.(candidate);
                }}
              >
                {candidate.labelKo}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          {amountLabel ? (
            <p className="mt-0.5 text-[12px] text-cyan-200/90">{amountLabel}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-white/45">
            booking.prepare · tier 3 · Field 승인 필요
          </p>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          예약 준비
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-foreground">
          {displayName} 숙박 예약을 결재함(Execution Inbox)에 준비합니다. 실제 예약은 Field에서
          CEO Sign 후 진행됩니다.
        </p>
      </div>

      <p className="text-[12px] text-white/55">결재함에 담을까요?</p>

      <MainActionButton
        label={busy ? "준비 중…" : "결재함에 담기"}
        brand={brand}
        compact
        onClick={() => onConfirmPrepare?.()}
        disabled={busy || Boolean(wire.disambiguation?.length && !activeLodging)}
      />
    </div>
  );
}
