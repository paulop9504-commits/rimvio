"use client";

import { motion } from "framer-motion";
import { useCopy } from "@/hooks/use-copy";
import type { AlignmentChatSlot } from "@/lib/peer-chat/alignment-chat-types";
import type { PortalCategoryId } from "@/lib/portal/portal-types";
import { portalCategorySlotMeta } from "@/lib/portal/portal-category-slot-meta";
import { cn } from "@/lib/utils";

export type PeerAlignmentSlotGridProps = {
  slots: readonly AlignmentChatSlot[];
  selectedCategoryId: PortalCategoryId | null;
  onSelectCategory: (categoryId: PortalCategoryId | null) => void;
  className?: string;
};

function categoryLabelKo(
  categoryId: PortalCategoryId,
  portalCopy: (typeof import("@/lib/copy/human-ko").copy)["portal"],
): string {
  switch (categoryId) {
    case "used_goods":
      return portalCopy.categoryUsedGoods;
    case "talent":
      return portalCopy.categoryTalent;
    case "job":
      return portalCopy.categoryJob;
    case "real_estate":
      return portalCopy.categoryRealEstate;
    case "ticket":
      return portalCopy.categoryTicket;
    case "service":
      return portalCopy.categoryService;
    case "home":
      return portalCopy.categoryHome;
    case "info":
      return portalCopy.categoryInfo;
    case "companion":
      return portalCopy.categoryCompanion;
    case "sport":
      return portalCopy.categorySport;
    case "study":
      return portalCopy.categoryStudy;
    case "project":
      return portalCopy.categoryProject;
    case "meetup":
      return portalCopy.categoryMeetup;
    case "event":
      return portalCopy.categoryEvent;
    default:
      return portalCopy.categoryUsedGoods;
  }
}

export function PeerAlignmentSlotGrid({
  slots,
  selectedCategoryId,
  onSelectCategory,
  className,
}: PeerAlignmentSlotGridProps) {
  const copy = useCopy();
  const slotCopy = copy.peers.friendRail.alignmentSlots;

  if (slots.length === 0) {
    return null;
  }

  return (
    <div className={cn("shrink-0 bg-[#fafbfc] px-4 pb-3 pt-3", className)}>
      <div className="mb-2.5 flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b95a1]">
            {slotCopy.eyebrow}
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-[#191f28]">
            {slotCopy.title}
          </p>
        </div>
        {selectedCategoryId ? (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3182f6] shadow-sm ring-1 ring-black/[0.04] active:scale-[0.98]"
          >
            {slotCopy.showAll}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {slots.map((slot, index) => {
          const meta = portalCategorySlotMeta(slot.portalCategoryId);
          const label = categoryLabelKo(slot.portalCategoryId, copy.portal);
          const selected = selectedCategoryId === slot.portalCategoryId;

          return (
            <motion.button
              key={slot.portalCategoryId}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.22 }}
              onClick={() =>
                onSelectCategory(selected ? null : slot.portalCategoryId)
              }
              aria-pressed={selected}
              aria-label={slotCopy.slotAria(label, slot.count)}
              className={cn(
                "relative overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 text-left shadow-sm ring-1 transition-transform active:scale-[0.98]",
                meta.cardClass,
                meta.ringClass,
                selected && "ring-2 ring-[#3182f6]/35 shadow-md",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[26px] leading-none" aria-hidden>
                  {meta.emoji}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                    slot.unreadCount > 0
                      ? "bg-[#FEE500] text-[#191919]"
                      : "bg-white/80 text-[#4e5968]",
                  )}
                >
                  {slot.count}
                </span>
              </div>
              <p className="mt-2.5 truncate text-[14px] font-semibold text-[#191f28]">
                {label}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[#6b7684]">
                {slotCopy.activeLine(slot.count)}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
