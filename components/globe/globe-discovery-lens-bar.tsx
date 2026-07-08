"use client";

import { cn } from "@/lib/utils";
import type { DiscoveryLensSession } from "@/lib/globe/discovery-lens/types";
import { lensPrefetchCountLabel } from "@/lib/globe/discovery-lens/prefetch-all-discovery-lenses";
import { copy } from "@/lib/copy/human-ko";

export type GlobeDiscoveryLensBarProps = {
  session: DiscoveryLensSession;
  onSelect: (lensId: DiscoveryLensSession["lenses"][number]["id"]) => void;
  className?: string;
};

/** Minimal a/b/c lens picker — tap selects POV + reel bundle. */
export function GlobeDiscoveryLensBar({
  session,
  onSelect,
  className,
}: GlobeDiscoveryLensBarProps) {
  if (session.lenses.length === 0) {
    return null;
  }

  const anyLoading = session.lenses.some(
    (lens) => lens.prefetch?.status === "loading",
  );

  return (
    <div
      className={cn("space-y-1.5", className)}
      data-globe-discovery-lens-bar
    >
      <p className="text-[11px] font-medium text-[#86868b]">
        {session.awaitingLensPick
          ? copy.globe.discoveryLensPickHint
          : anyLoading
            ? copy.globe.discoveryLensPrefetching
            : copy.globe.discoveryLensBarHint}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {session.lenses.map((lens) => {
          const active = lens.id === session.activeLensId;
          const count = lensPrefetchCountLabel(lens.prefetch);
          const loading = lens.prefetch?.status === "loading";
          return (
            <button
              key={lens.id}
              type="button"
              onClick={() => onSelect(lens.id)}
              className={cn(
                "rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition active:scale-[0.98]",
                active
                  ? "bg-[#0071e3] text-white shadow-sm"
                  : "bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-black/[0.05]",
              )}
              data-globe-discovery-lens-id={lens.id}
              aria-pressed={active}
            >
              <span className="mr-1 opacity-70">{lens.id}.</span>
              {lens.labelKo}
              {loading ? (
                <span className="ml-1 opacity-60">…</span>
              ) : count ? (
                <span
                  className={cn(
                    "ml-1 tabular-nums",
                    active ? "text-white/80" : "text-[#86868b]",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
