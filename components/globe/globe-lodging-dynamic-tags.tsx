"use client";

import { cn } from "@/lib/utils";
import type { LodgingDynamicTags } from "@/lib/globe/lodging/lodging-dynamic-tag-types";

export type GlobeLodgingDynamicTagsProps = {
  tags: LodgingDynamicTags;
  className?: string;
};

/** Transit chips + situational one-liner on lodging focus card. */
export function GlobeLodgingDynamicTags({ tags, className }: GlobeLodgingDynamicTagsProps) {
  if (tags.chips.length === 0 && !tags.contextLine) {
    return null;
  }

  return (
    <div className={cn("mt-2 space-y-2", className)} data-globe-lodging-dynamic-tags>
      {tags.chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex max-w-full items-center rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-semibold leading-snug text-white backdrop-blur-sm"
            >
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
      {tags.contextLine ? (
        <p className="rounded-xl bg-white/10 px-2.5 py-2 text-[11px] font-medium leading-snug text-white/92 backdrop-blur-sm">
          {tags.contextLine}
        </p>
      ) : null}
    </div>
  );
}
