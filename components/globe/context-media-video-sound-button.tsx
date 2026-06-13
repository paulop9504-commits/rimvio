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
        "pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full backdrop-blur-md",
        soundOn
          ? "bg-black/65 text-white ring-2 ring-white/30 shadow-lg"
          : "bg-white text-[#191f28] shadow-[0_4px_16px_rgba(0,0,0,0.35)] ring-2 ring-white",
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
