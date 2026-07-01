"use client";

import { globeActionPillStyles } from "@/lib/design/globe-action-pill-styles";
import { cn } from "@/lib/utils";

export type GlobeChatSlotChipsProps = {
  choices: readonly { id: string; labelKo: string }[];
  onSelect: (choice: { id: string; labelKo: string }) => void;
  className?: string;
  variant?: "confirm" | "slot" | "category";
  tone?: "dark" | "light";
  /** bubble = in-chat chips; action = 지금 할 일; map = dock row */
  size?: "bubble" | "action" | "map";
  layout?: "wrap" | "scroll";
};

function readPillButtonClass(
  variant: GlobeChatSlotChipsProps["variant"],
  tone: GlobeChatSlotChipsProps["tone"],
  size: NonNullable<GlobeChatSlotChipsProps["size"]>,
): string {
  const light = tone === "light";
  const confirm = variant === "confirm" || variant === "category";

  if (size === "action" || size === "map") {
    return light ? globeActionPillStyles.action.light : globeActionPillStyles.action.dark;
  }

  if (light) {
    return confirm
      ? globeActionPillStyles.bubble.lightConfirm
      : globeActionPillStyles.bubble.light;
  }
  return confirm
    ? globeActionPillStyles.bubble.darkConfirm
    : globeActionPillStyles.bubble.dark;
}

/** Tap-to-answer chips — storage, size, category confirm/pick. */
export function GlobeChatSlotChips({
  choices,
  onSelect,
  className,
  variant = "slot",
  tone = "light",
  size = "bubble",
  layout = "wrap",
}: GlobeChatSlotChipsProps) {
  if (choices.length === 0) {
    return null;
  }

  const buttonClass = readPillButtonClass(variant, tone, size);

  return (
    <div
      className={cn(
        size === "bubble" ? "mt-2" : "mt-0",
        layout === "scroll" ? globeActionPillStyles.rowScroll : globeActionPillStyles.rowWrap,
        className,
      )}
      data-globe-chat-slot-chips
      data-variant={variant}
      data-size={size}
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          onClick={() => onSelect(choice)}
          className={cn(globeActionPillStyles.buttonBase, buttonClass)}
        >
          {choice.labelKo}
        </button>
      ))}
    </div>
  );
}
