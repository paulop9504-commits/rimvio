"use client";

import { Loader2 } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { rimvioHeroCtaClass } from "@/lib/design/rimvio-ontology";
import type { PalantirCommitAction } from "@/lib/globe/spatial-semantic/resolve-palantir-commit-action";
import { cn } from "@/lib/utils";

export type GlobePalantirOperatorCommitRailProps = {
  action: PalantirCommitAction;
  pinned?: boolean;
  busy?: boolean;
  onCommit: () => void;
  compact?: boolean;
  className?: string;
};

/** Palantir commit rail — one hero CTA below operator brief (@ navigate · schedule). */
export function GlobePalantirOperatorCommitRail({
  action,
  pinned = false,
  busy = false,
  onCommit,
  compact = false,
  className,
}: GlobePalantirOperatorCommitRailProps) {
  return (
    <button
      type="button"
      disabled={busy || pinned}
      onClick={onCommit}
      className={cn(
        compact
          ? "flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1d1d1f] px-3 py-2 text-[11px] font-semibold text-white active:scale-[0.99] disabled:opacity-45"
          : cn(rimvioHeroCtaClass, "w-full"),
        pinned && "bg-[#0071e3] opacity-90",
        className,
      )}
      data-palantir-commit-rail
      data-palantir-commit-kind={action.kind}
      data-palantir-commit-feature={action.featureId}
      data-palantir-commit-pinned={pinned ? "true" : undefined}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : null}
      <span>{pinned ? copy.globe.palantirCommitPinned : action.labelKo}</span>
    </button>
  );
}
