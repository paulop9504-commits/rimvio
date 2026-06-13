"use client";

import { Volume2, VolumeX } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ContextMediaVideoSoundButtonProps = {
  soundOn: boolean;
  onEnableSound: () => void;
  className?: string;
};

/** Visible speaker control — iOS needs a clear tap target, not text-only hints. */
export function ContextMediaVideoSoundButton({
  soundOn,
  onEnableSound,
  className,
}: ContextMediaVideoSoundButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "pointer-events-auto flex size-9 items-center justify-center rounded-full backdrop-blur-sm",
        soundOn
          ? "bg-black/50 text-white ring-1 ring-white/20"
          : "bg-white text-[#191f28] shadow-md ring-2 ring-white/90",
        className,
      )}
      aria-label={
        soundOn ? copy.globe.contextVideoSoundOn : copy.globe.contextVideoSoundOff
      }
      aria-pressed={soundOn}
      onClick={(event) => {
        event.stopPropagation();
        onEnableSound();
      }}
    >
      {soundOn ? (
        <Volume2 className="size-[18px]" strokeWidth={2.25} aria-hidden />
      ) : (
        <VolumeX className="size-[18px]" strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}
