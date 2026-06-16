"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { Car, ChevronDown, Plane, Sparkles } from "lucide-react";
import type {
  ContextHubServiceId,
  ContextHubServiceRow,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const SERVICE_ICON: Record<ContextHubServiceId, typeof Plane> = {
  flight: Plane,
  rental_car: Car,
  ai_search: Sparkles,
};

const SWIPE_THRESHOLD_PX = 48;
const PANEL_WIDTH = "w-[min(calc(100vw-1.5rem),17.5rem)]";

export type GlobeHubResourceCarouselProps = {
  rows: readonly ContextHubServiceRow[];
  index: number;
  onIndexChange: (index: number) => void;
  onRunRow: (row: ContextHubServiceRow) => void;
  onExpand: () => void;
  busy?: boolean;
  contextPlace?: string | null;
  className?: string;
};

function resolveSlotTitle(row: ContextHubServiceRow): string {
  if (row.connected && row.link?.actionLabelKo) {
    return row.link.actionLabelKo;
  }
  if (row.handoffLabelKo) {
    return row.handoffLabelKo;
  }
  return row.labelKo;
}

function resolveSlotSubtitle(row: ContextHubServiceRow): string {
  if (!row.implemented) {
    return copy.globe.contextHubServiceSoon;
  }
  if (row.connected && row.link?.shortLabel) {
    return row.link.shortLabel;
  }
  if (row.connected) {
    return copy.globe.contextHubDepartureKind;
  }
  return copy.globe.contextHubServicePlugIn;
}

export function GlobeHubResourceCarousel({
  rows,
  index,
  onIndexChange,
  onRunRow,
  onExpand,
  busy = false,
  contextPlace = null,
  className,
}: GlobeHubResourceCarouselProps) {
  const row = rows[index] ?? rows[0];
  const dragX = useMotionValue(0);
  const [hintSeen, setHintSeen] = useState(false);

  useEffect(() => {
    dragX.set(0);
  }, [dragX, index]);

  useEffect(() => {
    if (rows.length <= 1 || hintSeen) {
      return;
    }
    try {
      if (sessionStorage.getItem("rimvio-hub-swipe-hint-seen") === "true") {
        setHintSeen(true);
      }
    } catch {
      /* ignore */
    }
  }, [hintSeen, rows.length]);

  const markHintSeen = useCallback(() => {
    setHintSeen(true);
    try {
      sessionStorage.setItem("rimvio-hub-swipe-hint-seen", "true");
    } catch {
      /* ignore */
    }
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= rows.length || next === index) {
        return;
      }
      markHintSeen();
      onIndexChange(next);
    },
    [index, markHintSeen, onIndexChange, rows.length],
  );

  const onDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      if (offset < -SWIPE_THRESHOLD_PX || velocity < -420) {
        goTo(index + 1);
      } else if (offset > SWIPE_THRESHOLD_PX || velocity > 420) {
        goTo(index - 1);
      }
      animate(dragX, 0, { type: "spring", stiffness: 520, damping: 36 });
    },
    [dragX, goTo, index],
  );

  if (!row) {
    return null;
  }

  const Icon = SERVICE_ICON[row.serviceId];
  const showSwipeHint = rows.length > 1 && !hintSeen;

  return (
    <aside
      className={cn(
        "pointer-events-auto overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/95 shadow-[0_10px_32px_rgba(2,32,71,0.1)] backdrop-blur-xl",
        PANEL_WIDTH,
        className,
      )}
      data-globe-hub-carousel
      aria-label={copy.globe.contextHubRailTitle}
    >
      <div className="border-b border-border/50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              {copy.globe.contextHubEyebrow}
            </p>
            {contextPlace ? (
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {copy.globe.contextHubRailForContext(contextPlace)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onExpand}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 active:bg-muted"
            aria-label={copy.globe.contextHubExpandAria}
            data-globe-hub-rail-expand
          >
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative px-2 pb-2 pt-1.5">
        <motion.button
          type="button"
          disabled={busy}
          drag={rows.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.14}
          style={{ x: dragX }}
          onDragEnd={onDragEnd}
          onClick={() => onRunRow(row)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left active:scale-[0.99]",
            row.connected
              ? "border-primary/20 bg-primary/[0.05]"
              : "border-border/50 bg-card",
          )}
          data-globe-hub-carousel-index={index}
          data-globe-hub-primary={row.serviceId}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-[1.125rem]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-foreground">
              {resolveSlotTitle(row)}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {resolveSlotSubtitle(row)}
            </span>
          </span>
          {rows.length > 1 ? (
            <span className="shrink-0 text-[11px] font-semibold text-primary/70" aria-hidden>
              →
            </span>
          ) : null}
        </motion.button>

        {showSwipeHint ? (
          <p className="mt-1.5 text-center text-[10px] font-medium text-muted-foreground">
            {copy.globe.contextHubSwipeHint}
          </p>
        ) : null}

        {rows.length > 1 ? (
          <div
            className="mt-2 flex items-center justify-center gap-1.5"
            role="tablist"
            aria-label={copy.globe.contextHubCarouselDotsAria}
          >
            {rows.map((slot, dotIndex) => (
              <button
                key={slot.serviceId}
                type="button"
                role="tab"
                aria-selected={dotIndex === index}
                aria-label={`${slot.labelKo} ${dotIndex + 1}/${rows.length}`}
                onClick={() => goTo(dotIndex)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  dotIndex === index
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/35",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
