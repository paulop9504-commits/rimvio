"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarRange,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type LodgingCheckoutStep = "review" | "pay" | "done";

const STEP_ORDER: readonly LodgingCheckoutStep[] = ["review", "pay", "done"];

export function formatStayRangeKo(checkInIso: string, checkOutIso: string): string {
  const checkIn = checkInIso.slice(0, 10);
  const checkOut = checkOutIso.slice(0, 10);
  if (!checkIn || !checkOut) {
    return "";
  }
  const inDate = new Date(`${checkIn}T12:00:00`);
  const outDate = new Date(`${checkOut}T12:00:00`);
  const nights = Math.max(
    1,
    Math.round((outDate.getTime() - inDate.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const fmt = (ymd: string) => {
    const [y, m, d] = ymd.split("-");
    return `${Number(m)}월 ${Number(d)}일`;
  };
  return `${fmt(checkIn)} – ${fmt(checkOut)} · ${nights}박`;
}

export function formatKrwCompact(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export function GlobeLodgingCheckoutStepBar({
  step,
  labels,
}: {
  step: LodgingCheckoutStep;
  labels: { review: string; pay: string; done: string };
}) {
  const activeIndex = STEP_ORDER.indexOf(step);
  const labelMap = {
    review: labels.review,
    pay: labels.pay,
    done: labels.done,
  };

  return (
    <div className="flex items-center gap-1.5" data-globe-lodging-checkout-steps>
      {STEP_ORDER.map((key, index) => {
        const active = index <= activeIndex;
        const current = index === activeIndex;
        return (
          <div key={key} className="flex min-w-0 flex-1 items-center gap-1.5">
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                current
                  ? "bg-[#0071e3] text-white shadow-[0_4px_12px_rgba(0,113,227,0.35)]"
                  : active
                    ? "bg-[#0071e3]/12 text-[#0071e3]"
                    : "bg-[#f2f2f7] text-[#aeaeb2]",
              )}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                "truncate text-[10px] font-semibold tracking-tight",
                current ? "text-[#1d1d1f]" : "text-[#8e8e93]",
              )}
            >
              {labelMap[key]}
            </span>
            {index < STEP_ORDER.length - 1 ? (
              <div
                className={cn(
                  "mx-0.5 h-px min-w-[8px] flex-1",
                  index < activeIndex ? "bg-[#0071e3]/35" : "bg-[#e5e5ea]",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function GlobeLodgingStaySummaryCard(input: {
  propertyName: string;
  roomTitle: string;
  occupancyLabel: string;
  checkInIso: string;
  checkOutIso: string;
  amountKrw: number;
  coverImageUrl?: string | null;
  partnerLabel?: string | null;
  refundable?: boolean;
  liveRate?: boolean;
}) {
  const stayLabel = formatStayRangeKo(input.checkInIso, input.checkOutIso);
  const image = input.coverImageUrl?.trim();

  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-[#fafafc] to-[#f3f4f8] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
      <div className="flex gap-3">
        <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-[#e8e8ed] shadow-sm">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="size-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex size-full items-center justify-center px-2 text-center text-[10px] font-semibold leading-tight text-[#86868b]">
              {input.propertyName.slice(0, 12)}
            </div>
          )}
          {input.liveRate ? (
            <span className="absolute bottom-1 left-1 rounded-md bg-white/92 px-1.5 py-0.5 text-[9px] font-bold text-[#0071e3] shadow-sm backdrop-blur-sm">
              LIVE
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
            {input.propertyName}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#515154]">
            {input.roomTitle}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {input.refundable ? (
              <GlobeLodgingBadge tone="mint" label={copy.globe.lodgingBookingRefundable} />
            ) : (
              <GlobeLodgingBadge tone="neutral" label={copy.globe.lodgingBookingRefundLimited} />
            )}
            {input.partnerLabel ? (
              <GlobeLodgingBadge tone="blue" label={input.partnerLabel} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/80 px-2.5 py-2 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-1 text-[#8e8e93]">
            <CalendarRange className="size-3.5" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {copy.globe.lodgingBookingSchedule}
            </span>
          </div>
          <p className="mt-1 text-[12px] font-medium leading-snug text-[#1d1d1f]">
            {stayLabel || "—"}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 px-2.5 py-2 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-1 text-[#8e8e93]">
            <Users className="size-3.5" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {copy.globe.lodgingBookingGuests}
            </span>
          </div>
          <p className="mt-1 text-[12px] font-medium leading-snug text-[#1d1d1f]">
            {input.occupancyLabel}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-black/[0.05] pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">
            {copy.globe.lodgingBookingTotalPay}
          </p>
          <p className="mt-0.5 text-[22px] font-bold tracking-tight text-[#1d1d1f]">
            {formatKrwCompact(input.amountKrw)}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-[#6e6e73]">
          <ShieldCheck className="size-3.5 text-[#34c759]" aria-hidden />
          {copy.globe.lodgingBookingSecurePay}
        </div>
      </div>
    </div>
  );
}

export function GlobeLodgingBadge({
  label,
  tone,
}: {
  label: string;
  tone: "mint" | "blue" | "neutral" | "gold";
}) {
  const toneClass =
    tone === "mint"
      ? "bg-[#e8f8ee] text-[#1b7f3a]"
      : tone === "blue"
        ? "bg-[#e8f1ff] text-[#005bb5]"
        : tone === "gold"
          ? "bg-[#fff6e5] text-[#9a6700]"
          : "bg-[#f2f2f7] text-[#636366]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        toneClass,
      )}
    >
      {label}
    </span>
  );
}

export function GlobeLodgingSecurePayNote({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-[#f5f9ff] px-3 py-2.5 ring-1 ring-[#0071e3]/10">
      <Lock className="mt-0.5 size-4 shrink-0 text-[#0071e3]" aria-hidden />
      <p className="text-[12px] leading-relaxed text-[#3a3a3c]">{children}</p>
    </div>
  );
}

export function GlobeLodgingCheckoutDoneHero({
  confirmationCode,
  title,
  subtitle,
}: {
  confirmationCode?: string | null;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-[1.25rem] bg-gradient-to-b from-[#f0faf3] to-white px-4 py-6 text-center ring-1 ring-[#34c759]/15"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-[#34c759]/12 text-[#34c759]">
        <CheckCircle2 className="size-8" aria-hidden />
      </div>
      <p className="mt-3 text-[17px] font-semibold text-[#1d1d1f]">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">{subtitle}</p>
      {confirmationCode ? (
        <div className="mt-4 w-full rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.05]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">
            {copy.globe.lodgingBookingConfirmCode}
          </p>
          <p className="mt-0.5 font-mono text-[15px] font-semibold tracking-wide text-[#1d1d1f]">
            {confirmationCode}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}

export function GlobeLodgingRoomOfferCard(input: {
  title: string;
  occupancyLabel: string;
  priceLine: string | null;
  coverImageUrl?: string | null;
  roomPhoto?: boolean;
  refundable: boolean;
  sourceLabel: string;
  recommended?: boolean;
  liveRate?: boolean;
  selected?: boolean;
  busy?: boolean;
  ctaLabel: string;
  onSelect: () => void;
  expressReady?: boolean;
  expressCtaLabel?: string;
  onExpressSelect?: () => void;
  index?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (input.index ?? 0) * 0.05, duration: 0.28 }}
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] p-3.5 transition-shadow",
        input.selected
          ? "bg-white shadow-[0_12px_32px_rgba(0,113,227,0.14)] ring-2 ring-[#0071e3]"
          : "bg-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]",
      )}
    >
      {input.recommended ? (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#fff6e5] px-2 py-0.5 text-[10px] font-bold text-[#9a6700]">
          <Sparkles className="size-3" aria-hidden />
          {copy.globe.lodgingBookingRecommended}
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        {input.coverImageUrl ? (
          <div className="relative size-[4.25rem] shrink-0 overflow-hidden rounded-2xl bg-[#ececf0] shadow-sm ring-1 ring-black/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={input.coverImageUrl}
              alt=""
              className="size-full object-cover"
              draggable={false}
            />
            {input.roomPhoto ? (
              <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {copy.globe.lodgingRoomCardPhotoBadge}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug tracking-tight text-[#1d1d1f]">
            {input.title}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-[#6e6e73]">
            <Users className="size-3.5 shrink-0" aria-hidden />
            {input.occupancyLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {input.refundable ? (
              <GlobeLodgingBadge tone="mint" label={copy.globe.lodgingBookingRefundable} />
            ) : (
              <GlobeLodgingBadge tone="neutral" label={copy.globe.lodgingBookingNonRefundable} />
            )}
            {input.liveRate ? (
              <GlobeLodgingBadge tone="blue" label={copy.globe.lodgingBookingLiveRate} />
            ) : null}
            <GlobeLodgingBadge tone="neutral" label={input.sourceLabel} />
          </div>
        </div>
        {input.priceLine ? (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">
              {copy.globe.lodgingBookingTotal}
            </p>
            <p className="mt-0.5 text-[16px] font-bold tracking-tight text-[#1d1d1f]">
              {input.priceLine}
            </p>
          </div>
        ) : null}
        </div>
      </div>

      <div className="mt-3.5 space-y-2">
        {input.expressReady && input.onExpressSelect ? (
          <button
            type="button"
            disabled={input.busy}
            onClick={input.onExpressSelect}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[14px] font-bold transition active:scale-[0.99] disabled:opacity-50",
              "bg-gradient-to-r from-[#ff6b00] to-[#ff9500] text-white shadow-[0_8px_20px_rgba(255,107,0,0.28)]",
            )}
            data-globe-lodging-express-pay
          >
            {input.busy ? "…" : (input.expressCtaLabel ?? copy.hubCheckout.expressTitle)}
          </button>
        ) : null}
        <button
          type="button"
          disabled={input.busy}
          onClick={input.onSelect}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[14px] font-semibold transition active:scale-[0.99] disabled:opacity-50",
            input.expressReady
              ? "bg-[#f2f2f7] text-[#1d1d1f] ring-1 ring-black/[0.06]"
              : input.selected
                ? "bg-[#0071e3] text-white shadow-[0_8px_20px_rgba(0,113,227,0.28)]"
                : "bg-[#1d1d1f] text-white shadow-[0_6px_16px_rgba(0,0,0,0.12)]",
          )}
        >
          {input.busy ? "…" : input.expressReady ? copy.hubCheckout.expressOtherPay : input.ctaLabel}
          {!input.busy && !input.expressReady ? (
            <BadgeCheck className="size-4 opacity-90" aria-hidden />
          ) : null}
        </button>
      </div>
    </motion.article>
  );
}
