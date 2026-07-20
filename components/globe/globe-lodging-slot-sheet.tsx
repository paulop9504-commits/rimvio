"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, Users, X } from "lucide-react";
import {
  SlotCounterRow,
} from "@/components/globe/globe-lodging-booking-slot-chips";
import { copy } from "@/lib/copy/human-ko";
import {
  areLodgingStayDatesValid,
  clampLodgingCheckInYmd,
  localYmdToday,
  lodgingCheckOutMinYmd,
  normalizeLodgingStayYmdPair,
} from "@/lib/globe/context-hub/lodging-booking-date-bounds";
import type { LodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { cn } from "@/lib/utils";

export type GlobeLodgingSlotSheetProps = {
  open: boolean;
  initialSlots: LodgingBookingSlots;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    checkInIso: string;
    checkOutIso: string;
    guestCount: number;
    roomCount: number;
  }) => void;
};

function inputDateValue(iso: string | null): string {
  return iso?.slice(0, 10) ?? "";
}

function dateFieldClassName(): string {
  return cn(
    "w-full rounded-2xl bg-white px-3 py-3 text-[14px] font-medium text-[#1d1d1f] outline-none ring-1 ring-black/[0.06]",
    "focus:ring-2 focus:ring-[#0071e3]/35",
  );
}

/** Field-style slot collection for lodging booking before scout. */
export function GlobeLodgingSlotSheet({
  open,
  initialSlots,
  onOpenChange,
  onSubmit,
}: GlobeLodgingSlotSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [checkIn, setCheckIn] = useState(inputDateValue(initialSlots.checkInIso));
  const [checkOut, setCheckOut] = useState(inputDateValue(initialSlots.checkOutIso));
  const [guestCount, setGuestCount] = useState(initialSlots.guestCount ?? 1);
  const [roomCount, setRoomCount] = useState(initialSlots.roomCount ?? 1);

  const today = localYmdToday();
  const checkOutMin = lodgingCheckOutMinYmd(checkIn || today, today);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const stay = normalizeLodgingStayYmdPair({
      checkInYmd: inputDateValue(initialSlots.checkInIso),
      checkOutYmd: inputDateValue(initialSlots.checkOutIso),
    });
    setCheckIn(stay.checkInYmd);
    setCheckOut(stay.checkOutYmd);
    setGuestCount(initialSlots.guestCount ?? 1);
    setRoomCount(initialSlots.roomCount ?? 1);
  }, [initialSlots, open]);

  const canSubmit = useMemo(
    () =>
      areLodgingStayDatesValid({
        checkInYmd: checkIn,
        checkOutYmd: checkOut,
        today,
      }) &&
      guestCount > 0 &&
      roomCount > 0,
    [checkIn, checkOut, guestCount, roomCount, today],
  );

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 px-0 pb-0 pt-8 backdrop-blur-[2px] sm:px-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={copy.common.close}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-t-[1.75rem] bg-[#fbfbfd] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            data-globe-lodging-slot-sheet
          >
            <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[#d1d1d6]" aria-hidden />
            </div>

            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#eef3ff] text-[#0071e3]">
                    <CalendarRange className="size-4" aria-hidden />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                    {copy.hubCheckout.eyebrow}
                  </p>
                </div>
                <h2 className="mt-2 text-[20px] font-bold tracking-tight text-[#1d1d1f]">
                  {copy.globe.lodgingSlotSheetTitle}
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">
                  {copy.globe.lodgingSlotSheetHint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 items-center justify-center rounded-full bg-white text-[#515154] shadow-sm ring-1 ring-black/[0.06]"
                aria-label={copy.common.close}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
                    {copy.globe.lodgingSlotCheckIn}
                  </span>
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(event) => {
                      const next = clampLodgingCheckInYmd(
                        event.target.value,
                        today,
                      );
                      setCheckIn(next);
                      const minOut = lodgingCheckOutMinYmd(next, today);
                      setCheckOut((prev) =>
                        !prev || prev < minOut ? minOut : prev,
                      );
                    }}
                    className={dateFieldClassName()}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
                    {copy.globe.lodgingSlotCheckOut}
                  </span>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkOutMin}
                    onChange={(event) => {
                      const next = event.target.value;
                      setCheckOut(next < checkOutMin ? checkOutMin : next);
                    }}
                    className={dateFieldClassName()}
                  />
                </label>
              </div>

              <SlotCounterRow
                label={copy.globe.lodgingSlotGuestCount}
                icon={<Users className="size-4" aria-hidden />}
                value={guestCount}
                min={1}
                max={12}
                onChange={setGuestCount}
              />
              <SlotCounterRow
                label={copy.globe.lodgingSlotRoomCount}
                icon={<CalendarRange className="size-4" aria-hidden />}
                value={roomCount}
                min={1}
                max={6}
                onChange={setRoomCount}
              />
            </div>

            <div className="border-t border-black/[0.05] bg-white/80 px-4 py-3 backdrop-blur-md">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => {
                  const stay = normalizeLodgingStayYmdPair({
                    checkInYmd: checkIn,
                    checkOutYmd: checkOut,
                    today,
                  });
                  onSubmit({
                    checkInIso: `${stay.checkInYmd}T15:00:00.000Z`,
                    checkOutIso: `${stay.checkOutYmd}T11:00:00.000Z`,
                    guestCount,
                    roomCount,
                  });
                }}
                className="w-full rounded-2xl bg-[#0071e3] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] disabled:opacity-40 active:scale-[0.99]"
              >
                {copy.globe.lodgingSlotApply}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
