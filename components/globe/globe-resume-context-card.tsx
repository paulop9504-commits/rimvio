"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { GlobeResumeSession } from "@/lib/globe/globe-resume-session";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeResumeContextCardProps = {
  session: GlobeResumeSession;
  onResume: () => void;
  onDismiss: () => void;
  className?: string;
};

export function GlobeResumeContextCard({
  session,
  onResume,
  onDismiss,
  className,
}: GlobeResumeContextCardProps) {
  const place = session.placeLabel?.trim();
  const body = place ? `${session.title} · ${place}` : session.title;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden rounded-[1.25rem] bg-white/94 shadow-[0_8px_28px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.05] backdrop-blur-xl",
        className,
      )}
      data-globe-resume-context-card
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
            {copy.globe.resumeContextEyebrow}
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-foreground">{body}</p>
        </div>
        <button
          type="button"
          onClick={onResume}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground active:scale-[0.98]"
        >
          {copy.globe.resumeContextCta}
          <ChevronRight className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full px-2 py-1 text-[12px] font-medium text-muted-foreground active:bg-black/[0.04]"
          aria-label={copy.globe.resumeContextDismiss}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
