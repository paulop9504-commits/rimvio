"use client";

import { ShieldCheck } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { MirrorProvenanceSummary } from "@/lib/globe/mirror-provenance";
import { cn } from "@/lib/utils";

export type GlobeContextProvenanceChipProps = {
  summary: MirrorProvenanceSummary;
  onPress: () => void;
  className?: string;
};

function modeLabel(summary: MirrorProvenanceSummary): string {
  switch (summary.projectionMode) {
    case "shared":
      return copy.globe.provenanceChipSharedOut;
    case "shared_mirrored":
      return copy.globe.provenanceChipSharedIn;
    case "mirrored":
      return copy.globe.provenanceChipMirrored;
    case "personal":
    default:
      return copy.globe.provenanceChipMine;
  }
}

function syncLabel(summary: MirrorProvenanceSummary): string {
  switch (summary.syncState) {
    case "pending_pull":
      return copy.globe.provenanceChipStatusPendingPull;
    case "pending_push":
      return copy.globe.provenanceChipStatusPendingPush;
    case "conflict":
      return copy.globe.provenanceChipStatusConflict;
    case "detached":
      return copy.globe.provenanceChipStatusDetached;
    case "source_deleted":
      return copy.globe.provenanceChipStatusSourceDeleted;
    case "synced":
    default:
      return summary.hasLocalOverrides
        ? copy.globe.provenanceChipStatusLocalOverride
        : copy.globe.provenanceChipStatusSynced;
  }
}

export function GlobeContextProvenanceChip({
  summary,
  onPress,
  className,
}: GlobeContextProvenanceChipProps) {
  const labels = [
    modeLabel(summary),
    summary.showOriginalAuthor && summary.originalAuthorDisplayName
      ? copy.globe.provenanceChipOriginal(summary.originalAuthorDisplayName)
      : null,
    syncLabel(summary),
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-1",
        "text-[10px] font-semibold text-muted-foreground ring-1 ring-black/[0.05] active:scale-[0.99]",
        className,
      )}
      aria-label={copy.globe.provenanceChipAria}
      data-globe-context-provenance-chip
    >
      <ShieldCheck className="size-3 shrink-0 text-primary/80" aria-hidden />
      <span className="truncate">{labels.join(" · ")}</span>
    </button>
  );
}
