"use client";

import { cn } from "@/lib/utils";

export type OperatorChoiceChip = {
  readonly id: string;
  readonly label: string;
};

export type GlobeOperatorChoiceChipsProps = {
  reasonKo: string;
  choices: readonly OperatorChoiceChip[];
  onSelect: (choice: OperatorChoiceChip) => void;
  mapDark?: boolean;
  lightPill?: boolean;
  className?: string;
};

/** Operator-blocked destination / quick actions — tap chips, not Blueprint UI. */
export function GlobeOperatorChoiceChips({
  reasonKo,
  choices,
  onSelect,
  mapDark = false,
  lightPill = false,
  className,
}: GlobeOperatorChoiceChipsProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex w-full flex-col items-center gap-1.5 px-1", className)}
      data-globe-operator-choice-chips
      role="group"
      aria-label={reasonKo}
    >
      <p
        className={cn(
          "max-w-[min(100%,20rem)] text-center text-[11px] font-medium leading-snug line-clamp-2 rounded-full px-2.5 py-1",
          lightPill
            ? "bg-white/92 text-[#6b7684] ring-1 ring-black/[0.06]"
            : mapDark
              ? "bg-[#121316]/78 text-white/72 ring-1 ring-white/12"
              : "bg-white/90 text-[#6b7684] ring-1 ring-black/[0.05]",
        )}
      >
        {reasonKo}
      </p>
      <div className="flex max-w-[min(100%,22rem)] flex-wrap justify-center gap-1.5">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onSelect(choice)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-transform active:scale-[0.98]",
              lightPill
                ? "bg-[#e8f3ff] text-[#3182f6] ring-1 ring-[#3182f6]/20"
                : mapDark
                  ? "bg-white/12 text-white/92 ring-1 ring-white/16"
                  : "bg-[#e8f3ff] text-[#3182f6] ring-1 ring-[#3182f6]/15",
            )}
            data-globe-operator-choice={choice.id}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
