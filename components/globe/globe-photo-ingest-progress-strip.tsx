"use client";

import { Check, Film, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { PhotoIngestFileItem } from "@/lib/globe/photo-ingest-file-progress";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobePhotoIngestProgressStripProps = {
  items: readonly PhotoIngestFileItem[];
  className?: string;
};

function statusIcon(status: PhotoIngestFileItem["status"]) {
  if (status === "done") {
    return <Check className="size-3.5 text-primary" aria-hidden />;
  }
  if (status === "reading" || status === "committing") {
    return <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />;
  }
  return null;
}

/** Cursor-style per-file ingest performance strip under the walkthrough card. */
export function GlobePhotoIngestProgressStrip({
  items,
  className,
}: GlobePhotoIngestProgressStripProps) {
  if (items.length === 0) {
    return null;
  }

  const activeIndex = items.findIndex(
    (row) => row.status === "reading" || row.status === "committing",
  );
  const doneCount = items.filter((row) => row.status === "done").length;
  const active = activeIndex >= 0 ? items[activeIndex] : null;
  const headline =
    active?.status === "committing"
      ? copy.globe.photoIngestProgressCommitting(active.fileName, doneCount + 1, items.length)
      : active?.status === "reading"
        ? copy.globe.photoIngestProgressReading(active.fileName, activeIndex + 1, items.length)
        : doneCount === items.length
          ? copy.globe.photoIngestProgressReady(items.length)
          : copy.globe.photoIngestProgressQueued(items.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full max-w-[360px] rounded-[1.25rem] bg-white/92 px-3 py-3 shadow-[0_8px_28px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.05] backdrop-blur-xl",
        className,
      )}
      data-globe-photo-ingest-progress
    >
      <p className="mb-2.5 truncate text-[12px] font-medium text-muted-foreground">
        {headline}
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => {
          const activeRow =
            item.status === "reading" || item.status === "committing";
          return (
            <li
              key={item.key}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-xl ring-1 ring-black/[0.06]",
                activeRow && "ring-2 ring-primary/40",
              )}
              title={item.fileName}
            >
              <div className="relative size-14 bg-black/[0.04]">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Film className="size-5" aria-hidden />
                  </div>
                )}
                {activeRow ? (
                  <motion.div
                    className="pointer-events-none absolute inset-0 bg-primary/10"
                    animate={{ opacity: [0.35, 0.75, 0.35] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                ) : null}
                <span className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-white/90 shadow-sm">
                  {statusIcon(item.status)}
                </span>
              </div>
              <p className="max-w-14 truncate px-1 py-0.5 text-center text-[9px] text-muted-foreground">
                {index + 1}
              </p>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
