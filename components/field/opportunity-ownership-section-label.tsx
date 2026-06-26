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
        "flex items-center justify-between gap-3 px-5 pb-1.5 pt-2.5",
        className,
      )}
      data-opportunity-section={tone}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            tone === "mine" ? "bg-[#3182f6]" : "bg-[#b0b8c1]",
          )}
          aria-hidden
        />
        <p className="truncate text-[12px] font-semibold tracking-tight text-[#6b7684]">
          {title}
        </p>
      </div>
      {hint ? (
        <p className={cn(RIMVIO_TYPE.caption, "shrink-0 text-[11px] text-[#b0b8c1]")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
