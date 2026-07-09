"use client";

import type { ReactNode } from "react";
import { CalendarRange, Minus, Plus, Users } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeLodgingBookingSlotChipsProps = {
  chips: readonly string[];
  onEdit: () => void;
  className?: string;
};

/** Inline lodging slot summary — tap reopens intake in the compose thread. */
export function GlobeLodgingBookingSlotChips({
  chips,
  onEdit,
  className,
}: GlobeLodgingBookingSlotChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-[1.15rem] bg-gradient-to-r from-white to-[#f7f8fc] px-3 py-2.5 text-left shadow-[0_6px_18px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05] transition active:scale-[0.99]",
        className,
      )}
      data-globe-lodging-booking-slot-chips
      aria-label={copy.globe.lodgingSlotChipsEditAria}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#0071e3]">
        <CalendarRange className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.06]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-[#f2f2f7] px-2.5 py-1 text-[10px] font-semibold text-[#515154] transition group-hover:bg-[#e8f1ff] group-hover:text-[#0071e3]">
        {copy.globe.lodgingSlotChipsEdit}
      </span>
    </button>
  );
}

function SlotCounterRow({
  label,
  icon,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-black/[0.05]">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f2f2f7] text-[#515154]">
          {icon}
        </div>
        <span className="text-[13px] font-medium text-[#1d1d1f]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex size-8 items-center justify-center rounded-full bg-[#f2f2f7] text-[#1d1d1f] disabled:opacity-35"
          aria-label={`${label} 감소`}
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <span className="w-6 text-center text-[15px] font-semibold tabular-nums text-[#1d1d1f]">
          {value}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex size-8 items-center justify-center rounded-full bg-[#0071e3] text-white disabled:opacity-35"
          aria-label={`${label} 증가`}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export { SlotCounterRow };
