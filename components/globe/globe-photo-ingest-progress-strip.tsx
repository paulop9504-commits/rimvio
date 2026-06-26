"use client";

import { Check, Film, Loader2, RotateCcw, X } from "lucide-react";
import { motion } from "framer-motion";
import type { PhotoIngestFileItem } from "@/lib/globe/photo-ingest-file-progress";
import { summarizePhotoIngestProgress } from "@/lib/globe/photo-ingest-file-progress";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobePhotoIngestProgressStripProps = {
  items: readonly PhotoIngestFileItem[];
  className?: string;
  onRetryFile?: (fileIndex: number) => void;
  retryingIndex?: number | null;
};

function statusIcon(status: PhotoIngestFileItem["status"]) {
  if (status === "done") {
    return <Check className="size-3.5 text-primary" aria-hidden />;
  }
  if (status === "error") {
    return <X className="size-3.5 text-destructive" aria-hidden />;
  }
  if (status === "reading" || status === "committing") {
    return <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />;
  }
  return null;
}

/** Kakao-class per-file ingest queue — thumbs, bar, single-file retry. */
export function GlobePhotoIngestProgressStrip({
  items,
  className,
  onRetryFile,
  retryingIndex = null,
}: GlobePhotoIngestProgressStripProps) {
  if (items.length === 0) {
    return null;
  }

  const stats = summarizePhotoIngestProgress(items);
  const activeIndex = items.findIndex(
    (row) => row.status === "reading" || row.status === "committing",
  );
  const active = activeIndex >= 0 ? items[activeIndex] : null;
  const headline =
    active?.status === "committing"
      ? copy.globe.photoIngestProgressCommitting(
          active.fileName,
          stats.done + stats.failed + 1,
          stats.total,
        )
      : active?.status === "reading"
        ? copy.globe.photoIngestProgressReading(
            active.fileName,
            activeIndex + 1,
            stats.total,
          )
        : stats.done + stats.failed === stats.total
          ? copy.globe.photoIngestProgressSummary(stats.done, stats.total, stats.failed)
          : copy.globe.photoIngestProgressQueued(stats.total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full max-w-[min(100%,420px)] rounded-[1.25rem] bg-white/94 px-3 py-3 shadow-[0_8px_28px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.05] backdrop-blur-xl",
        className,
      )}
      data-globe-photo-ingest-progress
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[12px] font-medium text-muted-foreground">
          {headline}
        </p>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground/70">
          {stats.percent}%
        </span>
      </div>
      <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-black/[0.06]">
        <motion.div
          className={cn(
            "h-full rounded-full",
            stats.failed > 0 ? "bg-amber-500" : "bg-primary",
          )}
          initial={false}
          animate={{ width: `${stats.percent}%` }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => {
          const activeRow =
            item.status === "reading" ||
            item.status === "committing" ||
            retryingIndex === index;
          const failed = item.status === "error";
          return (
            <li
              key={item.key}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-xl ring-1 ring-black/[0.06]",
                activeRow && "ring-2 ring-primary/40",
                failed && "ring-2 ring-destructive/35",
              )}
              title={item.detail ? `${item.fileName} · ${item.detail}` : item.fileName}
            >
              <div className="relative size-14 bg-black/[0.04]">
                {item.previewUrl ? (
                  item.isVideo ? (
                    <video
                      src={item.previewUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  )
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
                {failed ? (
                  <span className="absolute inset-0 bg-black/35" aria-hidden />
                ) : null}
                <span className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-white/90 shadow-sm">
                  {statusIcon(item.status)}
                </span>
              </div>
              {failed && onRetryFile ? (
                <button
                  type="button"
                  className="mt-0.5 flex w-full items-center justify-center gap-0.5 rounded-lg bg-black/[0.04] py-0.5 text-[9px] font-semibold text-primary active:bg-black/[0.08]"
                  disabled={retryingIndex === index}
                  onClick={() => onRetryFile(index)}
                >
                  <RotateCcw className="size-2.5" aria-hidden />
                  {copy.globe.photoIngestProgressRetry}
                </button>
              ) : (
                <p className="max-w-14 truncate px-1 py-0.5 text-center text-[9px] text-muted-foreground">
                  {index + 1}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
