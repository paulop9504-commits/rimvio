"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";
import { PortalIntentTile } from "@/components/portal/portal-intent-tile";
import { copy } from "@/lib/copy/human-ko";
import { listPortalIntents } from "@/lib/portal/portal-intent-registry";
import type { PortalIntentId } from "@/lib/portal/portal-types";
import { cn } from "@/lib/utils";

export type GlobePortalIntentPeekToggleProps = {
  open: boolean;
  onToggle: () => void;
  className?: string;
};

/** Peek handle — opens intent grid above compose without the full portal sheet. */
export function GlobePortalIntentPeekToggle({
  open,
  onToggle,
  className,
}: GlobePortalIntentPeekToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-white/92 px-2.5 py-1",
        "text-[11px] font-semibold text-[#4e5968]",
        "shadow-[0_4px_16px_rgba(2,32,71,0.1)] ring-1 ring-black/[0.06] backdrop-blur-xl",
        "transition-colors active:bg-white",
        className,
      )}
      aria-expanded={open}
      aria-label={open ? copy.portal.peekToggleCollapse : copy.portal.peekToggleExpand}
      data-globe-portal-intent-peek-toggle
    >
      <LayoutGrid className="size-3.5 shrink-0 text-[#8b5cf6]" aria-hidden />
      <span>{copy.portal.projectionEyebrow}</span>
      {open ? (
        <ChevronDown className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
      ) : (
        <ChevronUp className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
      )}
    </button>
  );
}

export type GlobePortalIntentPeekPanelProps = {
  open: boolean;
  onSelectIntent: (intentId: PortalIntentId) => void;
  className?: string;
};

/** Compact 2×2 intent grid — same cards as the portal sheet home step. */
export function GlobePortalIntentPeekPanel({
  open,
  onSelectIntent,
  className,
}: GlobePortalIntentPeekPanelProps) {
  const intents = listPortalIntents();

  return (
    <div className={cn("pointer-events-auto w-full", className)} data-globe-portal-intent-peek-panel>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="portal-intent-peek-panel"
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 6, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-[1.1rem] bg-white/92 px-2 py-2 shadow-[0_6px_20px_rgba(2,32,71,0.08)] ring-1 ring-black/[0.05] backdrop-blur-xl">
              <p className="mb-1.5 px-1 text-[10px] font-semibold text-[#3182f6]">
                {copy.portal.projectionEyebrow}
              </p>
              <p className="mb-2 px-1 text-[13px] font-semibold leading-snug tracking-tight text-[#191f28]">
                {copy.portal.homeTitle}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {intents.map((intent, index) => (
                  <PortalIntentTile
                    key={intent.id}
                    intentId={intent.id}
                    title={intent.labelKo}
                    body={intent.bodyKo}
                    index={index}
                    compact
                    onClick={() => onSelectIntent(intent.id)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
