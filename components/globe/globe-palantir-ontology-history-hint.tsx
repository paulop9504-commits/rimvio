"use client";

import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobePalantirOntologyHistoryHintProps = {
  labelKo: string;
  className?: string;
};

/** One-line resume chip when a context investigation is restored. */
export function GlobePalantirOntologyHistoryHint({
  labelKo,
  className,
}: GlobePalantirOntologyHistoryHintProps) {
  const line = labelKo.trim();
  if (!line) {
    return null;
  }

  return (
    <p
      className={cn(
        "text-[10px] leading-relaxed text-[#86868b]",
        className,
      )}
      data-palantir-ontology-history-hint
    >
      {copy.globe.palantirOntologyHistoryResume(line)}
    </p>
  );
}
