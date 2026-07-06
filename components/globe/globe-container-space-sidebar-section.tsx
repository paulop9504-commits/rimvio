"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type GlobeContainerSpaceSidebarSectionProps = {
  sectionId: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: string | null;
  expandAriaLabel: string;
  collapseAriaLabel: string;
  children: ReactNode;
};

/** Collapsible block inside container space sidebar — saves vertical space on phone. */
export function GlobeContainerSpaceSidebarSection({
  sectionId,
  title,
  expanded,
  onToggle,
  badge = null,
  expandAriaLabel,
  collapseAriaLabel,
  children,
}: GlobeContainerSpaceSidebarSectionProps) {
  return (
    <div
      className="shrink-0 border-b border-white/8"
      data-globe-container-space-section={sectionId}
      data-globe-container-space-section-expanded={expanded ? "true" : "false"}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? collapseAriaLabel : expandAriaLabel}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left active:bg-white/[0.04]"
        data-globe-container-space-section-toggle={sectionId}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            {title}
          </span>
          {badge ? (
            <span className="flex min-w-[1rem] items-center justify-center rounded-full bg-[#3b82f6] px-1.5 py-px text-[9px] font-bold leading-none text-white">
              {badge}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-white/40 transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
