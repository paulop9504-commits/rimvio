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

/** Lens picker — rings around “나를 위한 주변” POV. */
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
      className={cn(
        "space-y-1.5 rounded-2xl bg-white/90 p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-globe-discovery-lens-bar
    >
      <p className="text-[11px] font-medium text-[#61616b]">
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
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                active
                  ? "bg-[#0071e3] text-white shadow-[0_4px_12px_rgba(0,113,227,0.45)]"
                  : "bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-black/[0.06] hover:bg-[#ebebf0]",
              )}
              data-globe-discovery-lens-id={lens.id}
              aria-pressed={active}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] tabular-nums",
                  active
                    ? "border-white/70 bg-white/10 text-white"
                    : "border-black/[0.08] bg-white text-[#1d1d1f]",
                )}
              >
                {lens.id.toUpperCase()}
              </span>
              <span className="truncate">{lens.labelKo}</span>
              {loading ? (
                <span className="ml-0.5 opacity-60">…</span>
              ) : count ? (
                <span
                  className={cn(
                    "ml-0.5 rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] tabular-nums",
                    active ? "bg-black/10 text-white/90" : "text-[#6b6b76]",
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
