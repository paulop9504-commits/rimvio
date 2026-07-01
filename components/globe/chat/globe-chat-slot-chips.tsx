"use client";

import { cn } from "@/lib/utils";

export type GlobeChatSlotChipsProps = {
  choices: readonly { id: string; labelKo: string }[];
  onSelect: (choice: { id: string; labelKo: string }) => void;
  className?: string;
  variant?: "confirm" | "slot" | "category";
  tone?: "dark" | "light";
};

/** Tap-to-answer chips — storage, size, category confirm/pick. */
export function GlobeChatSlotChips({
  choices,
  onSelect,
  className,
  variant = "slot",
  tone = "light",
}: GlobeChatSlotChipsProps) {
  if (choices.length === 0) {
    return null;
  }

  const light = tone === "light";

  return (
    <div
      className={cn("mt-2.5 flex flex-wrap gap-1.5", className)}
      data-globe-chat-slot-chips
      data-variant={variant}
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          onClick={() => onSelect(choice)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition-colors active:scale-[0.98]",
            light
              ? variant === "confirm"
                ? "bg-[#f0f2f5] text-[#191f28] ring-black/[0.08] hover:bg-[#e8ebee]"
                : "bg-[#e8f5ec] text-[#1a7f37] ring-[#34c759]/22 hover:bg-[#dcf5e4]"
              : variant === "confirm"
                ? "bg-white/10 text-white ring-white/16 hover:bg-white/14"
                : "bg-[#34c759]/14 text-[#b8f5c8] ring-[#34c759]/28 hover:bg-[#34c759]/22",
          )}
        >
          {choice.labelKo}
        </button>
      ))}
    </div>
  );
}
