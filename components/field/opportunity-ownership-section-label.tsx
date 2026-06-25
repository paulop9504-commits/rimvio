"use client";

import { cn } from "@/lib/utils";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";

export type OpportunityOwnershipSectionLabelProps = {
  title: string;
  hint?: string;
  tone?: "mine" | "neighbor";
  className?: string;
};

export function OpportunityOwnershipSectionLabel({
  title,
  hint,
  tone = "mine",
  className,
}: OpportunityOwnershipSectionLabelProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 pb-2 pt-3",
        className,
      )}
      data-opportunity-section={tone}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            tone === "mine" ? "bg-[#3182f6]" : "bg-[#8b95a1]",
          )}
          aria-hidden
        />
        <p className="truncate text-[13px] font-bold tracking-tight text-[#191f28]">
          {title}
        </p>
      </div>
      {hint ? (
        <p className={cn(RIMVIO_TYPE.caption, "shrink-0 text-[11px] text-[#8b95a1]")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
