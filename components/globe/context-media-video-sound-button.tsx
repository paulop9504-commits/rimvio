"use client";

import { Volume2, VolumeX } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ContextMediaVideoSoundButtonProps = {
  soundOn: boolean;
  onToggleSound: () => void;
  className?: string;
};

/** Left-rail speaker — toggles mute without opening pin sheet. */
export function ContextMediaVideoSoundButton({
  soundOn,
  onToggleSound,
  className,
}: ContextMediaVideoSoundButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full backdrop-blur-sm",
        soundOn
          ? "bg-black/55 text-white ring-1 ring-white/25"
          : "bg-white text-[#191f28] shadow-md ring-2 ring-white/90",
        className,
      )}
      aria-label={
        soundOn ? copy.globe.contextVideoSoundOn : copy.globe.contextVideoSoundOff
      }
      aria-pressed={soundOn}
      onClick={(event) => {
        event.stopPropagation();
        onToggleSound();
      }}
    >
      {soundOn ? (
        <Volume2 className="size-[19px]" strokeWidth={2.25} aria-hidden />
      ) : (
        <VolumeX className="size-[19px]" strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}
