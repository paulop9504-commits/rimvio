"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 420;

export type FixedContainerSlot = typeof FIXED_CALENDAR_CONTAINER_ID;

const CALENDAR_SLOT = {
  id: FIXED_CALENDAR_CONTAINER_ID,
  label: "캘린더",
  hint: "액션 스트림 · 일정",
  icon: Calendar,
  accent: "#10B981",
} as const;

type FixedContainerBarProps = {
  activeSlot?: FixedContainerSlot | null;
  hoverSlot?: FixedContainerSlot | null;
  activeActionCount?: number;
  onSelectSlot: (slot: FixedContainerSlot) => void;
  onOpenCalendar?: () => void;
  onSnapToSlot?: (slot: FixedContainerSlot) => void;
  onHoverSlot?: (slot: FixedContainerSlot | null) => void;
  className?: string;
};

export function FixedContainerBar({
  activeSlot = null,
  hoverSlot = null,
  activeActionCount = 0,
  onSelectSlot,
  onOpenCalendar,
  onSnapToSlot,
  onHoverSlot,
  className,
}: FixedContainerBarProps) {
  const slot = CALENDAR_SLOT;
  const Icon = slot.icon;
  const active = activeSlot === slot.id;
  const hover = hoverSlot === slot.id;

  return (
    <div
      className={cn(
        "fixed-container-bar shrink-0 border-b border-black/[0.04] bg-[#F9FAFB]/95 px-4 py-2 backdrop-blur-md",
        className
      )}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Container Bar
      </p>
      <motion.button
        type="button"
        layout
        onClick={() => {
          onSelectSlot(slot.id);
          onOpenCalendar?.();
          onSnapToSlot?.(slot.id);
        }}
        onPointerEnter={() => onHoverSlot?.(slot.id)}
        onPointerLeave={() => onHoverSlot?.(null)}
        animate={{ scale: hover ? 1.03 : 1 }}
        className={cn(
          "fixed-container-bar__slot flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-colors",
          active
            ? "border-[color-mix(in_srgb,var(--slot-accent)_40%,transparent)] bg-glango-surface shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--slot-accent)_30%,transparent)]"
            : "border-border bg-glango-surface/90",
          hover && "fixed-container-bar__slot--snap-target"
        )}
        style={{ ["--slot-accent" as string]: slot.accent }}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${slot.accent}18`, color: slot.accent }}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-[#1F2937]">{slot.label}</p>
            {activeActionCount > 0 ? (
              <span className="rounded-full bg-[#10B981] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeActionCount}
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-[#9CA3AF]">{slot.hint}</p>
        </div>
      </motion.button>
      <p className="mt-1.5 text-[10px] text-[#9CA3AF]">
        링크를 길게 눌러 캘린더 슬롯에 Snap하면 일정·알림으로 올릴 수 있어요
      </p>
    </div>
  );
}

export function useFixedContainerBarSnap() {
  const [hoverSlot, setHoverSlot] = useState<FixedContainerSlot | null>(null);
  const [activeSlot, setActiveSlot] = useState<FixedContainerSlot | null>(null);

  const snapLinkToSlot = useCallback(
    (slot: FixedContainerSlot, onSnap?: (slot: FixedContainerSlot) => void) => {
      setActiveSlot(slot);
      onSnap?.(slot);
    },
    []
  );

  return {
    hoverSlot,
    activeSlot,
    setHoverSlot,
    setActiveSlot,
    snapLinkToSlot,
  };
}

export function useLongPressDrag(onLongPress: () => void) {
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    timer.current = window.setTimeout(onLongPress, LONG_PRESS_MS);
  }, [clear, onLongPress]);

  const end = useCallback(() => {
    clear();
  }, [clear]);

  return { start, end, clear };
}
