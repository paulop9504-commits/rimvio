"use client";

import { copy } from "@/lib/copy/human-ko";
import type { PalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-operator";
import { cn } from "@/lib/utils";

export type GlobePalantirOperatorBriefProps = {
  snapshot: PalantirWorkspaceSnapshot;
  onOpenPrimary?: () => void;
  className?: string;
};

/** Palantir operator strip — AI brief + provenance (Globe already projected). */
export function GlobePalantirOperatorBrief({
  snapshot,
  onOpenPrimary,
  className,
}: GlobePalantirOperatorBriefProps) {
  const interactive = Boolean(onOpenPrimary && snapshot.primaryPlaceId);
  const Root = interactive ? "button" : "div";

  return (
    <Root
      type={interactive ? "button" : undefined}
      onClick={interactive ? onOpenPrimary : undefined}
      className={cn(
        "w-full rounded-xl bg-[#f5f5f7]/95 px-3 py-2.5 text-left ring-1 ring-black/[0.04]",
        interactive && "active:scale-[0.99] active:bg-[#efeff4]",
        className,
      )}
      data-palantir-operator-brief
      data-palantir-primary-place={snapshot.primaryPlaceId ?? undefined}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        {copy.globe.palantirOperatorEyebrow}
      </p>
      <p className="mt-1 text-[13px] font-medium leading-snug text-[#1d1d1f]">
        {snapshot.briefKo}
      </p>
      {snapshot.provenanceKo ? (
        <p className="mt-1 text-[10px] text-[#86868b]">{snapshot.provenanceKo}</p>
      ) : null}
      {interactive ? (
        <p className="mt-1.5 text-[10px] font-semibold text-[#0071e3]">
          {copy.globe.resourceReelBriefTapHint}
        </p>
      ) : null}
    </Root>
  );
}
