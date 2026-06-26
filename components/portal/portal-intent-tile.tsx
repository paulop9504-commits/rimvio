"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import type { PortalIntentId } from "@/lib/portal/portal-types";
import { cn } from "@/lib/utils";

type IntentVisual = {
  Icon: LucideIcon;
  accent: string;
  tileBg: string;
  iconRing: string;
  tileShadow: string;
};

export const PORTAL_INTENT_VISUAL: Record<PortalIntentId, IntentVisual> = {
  offer: {
    Icon: ArrowUpFromLine,
    accent: "#3182f6",
    tileBg: "bg-gradient-to-b from-[#3182f6]/[0.07] to-white",
    iconRing: "bg-[#3182f6]/10 ring-[#3182f6]/20",
    tileShadow: "shadow-[0_10px_28px_rgba(49,130,246,0.10)]",
  },
  seek: {
    Icon: ArrowDownToLine,
    accent: "#ef2b2b",
    tileBg: "bg-gradient-to-b from-[#ef2b2b]/[0.07] to-white",
    iconRing: "bg-[#ef2b2b]/10 ring-[#ef2b2b]/20",
    tileShadow: "shadow-[0_10px_28px_rgba(239,43,43,0.10)]",
  },
  together: {
    Icon: Users,
    accent: "#f59e0b",
    tileBg: "bg-gradient-to-b from-[#f59e0b]/[0.08] to-white",
    iconRing: "bg-[#f59e0b]/10 ring-[#f59e0b]/20",
    tileShadow: "shadow-[0_10px_28px_rgba(245,158,11,0.10)]",
  },
  join: {
    Icon: CalendarDays,
    accent: "#8b5cf6",
    tileBg: "bg-gradient-to-b from-[#8b5cf6]/[0.08] to-white",
    iconRing: "bg-[#8b5cf6]/10 ring-[#8b5cf6]/20",
    tileShadow: "shadow-[0_10px_28px_rgba(139,92,246,0.10)]",
  },
};

export const PORTAL_INTENT_TILE_MOTION = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: index * 0.05, duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  }),
};

export type PortalIntentTileProps = {
  intentId: PortalIntentId;
  title: string;
  body: string;
  index: number;
  onClick: () => void;
  compact?: boolean;
};

export function PortalIntentTile({
  intentId,
  title,
  body,
  index,
  onClick,
  compact = false,
}: PortalIntentTileProps) {
  const visual = PORTAL_INTENT_VISUAL[intentId];
  const { Icon } = visual;

  return (
    <motion.button
      type="button"
      custom={index}
      variants={PORTAL_INTENT_TILE_MOTION}
      initial="hidden"
      animate="show"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center overflow-hidden text-center",
        "rounded-[1.35rem] ring-1 ring-black/[0.05]",
        "transition-[box-shadow,ring-color] duration-200 active:ring-black/[0.08]",
        compact ? "min-h-[88px] gap-2 px-2 py-3" : "min-h-[148px] gap-3 px-3 py-4",
        visual.tileBg,
        visual.tileShadow,
      )}
      data-portal-intent={intentId}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl ring-1",
          "transition-transform duration-200 group-active:scale-95",
          compact ? "size-10" : "size-[52px]",
          visual.iconRing,
        )}
        aria-hidden
      >
        <Icon
          className={compact ? "size-[18px]" : "size-[22px]"}
          strokeWidth={2.1}
          style={{ color: visual.accent }}
        />
      </span>
      <span className="min-w-0 space-y-0.5 px-1">
        <span
          className={cn(
            "block font-semibold leading-tight tracking-tight text-[#191f28]",
            compact ? "text-[13px]" : "text-[15px]",
          )}
        >
          {title}
        </span>
        {!compact ? (
          <span className="block text-[12px] font-medium leading-snug text-[#6b7684]">{body}</span>
        ) : (
          <span className="block text-[10px] font-medium leading-snug text-[#8b95a1] line-clamp-1">
            {body}
          </span>
        )}
      </span>
    </motion.button>
  );
}
