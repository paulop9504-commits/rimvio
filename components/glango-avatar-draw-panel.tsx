"use client";

import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { GlangoPurpleRevealOverlay } from "@/components/glango-purple-reveal-overlay";
import {
  GLANGO_AVATAR_VARIANTS,
  isRarePurpleVariant,
  rollGlangoAvatarVariant,
  type GlangoAvatarVariantId,
} from "@/lib/brand/glango-avatar-colors";
import {
  GlangoAvatarMark,
  labelForAvatarVariant,
} from "@/lib/brand/glango-smiley-mark";
import { useCopy } from "@/hooks/use-copy";
import { useRoomGuest } from "@/hooks/use-room-guest";
import { completeAvatarDraw } from "@/lib/rooms/guest-session";
import { isE2eMode, resolveE2eAvatarVariant } from "@/lib/test/e2e-avatar";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

const VARIANT_CYCLE: GlangoAvatarVariantId[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
];

type DrawPhase = "idle" | "rolling" | "reveal";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function GlangoAvatarDrawPanel({ className }: { className?: string }) {
  const copy = useCopy();
  const searchParams = useSearchParams();
  const guest = useRoomGuest();
  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [displayVariant, setDisplayVariant] = useState<GlangoAvatarVariantId>("red");
  const [purpleRevealOpen, setPurpleRevealOpen] = useState(false);
  const rollingRef = useRef(false);
  const forcedVariant = resolveE2eAvatarVariant(searchParams.get("testVariant"));

  const finishDraw = useCallback(
    (finalVariant: GlangoAvatarVariantId) => {
      setDisplayVariant(finalVariant);
      setPhase("reveal");
      completeAvatarDraw(finalVariant);

      if (isRarePurpleVariant(finalVariant)) {
        setPurpleRevealOpen(true);
        toast.success(copy.settings.drawRevealPurple);
        return;
      }

      toast.success(
        copy.settings.drawReveal(
          labelForAvatarVariant(finalVariant),
          GLANGO_AVATAR_VARIANTS[finalVariant].tierEmoji
        )
      );
    },
    [copy.settings]
  );

  const runDraw = useCallback(async () => {
    if (rollingRef.current || guest.avatarDrawn) {
      return;
    }

    rollingRef.current = true;
    setPhase("rolling");

    const finalVariant = forcedVariant ?? rollGlangoAvatarVariant();
    const totalMs = forcedVariant || isE2eMode() ? 180 : 2800;
    const startedAt = performance.now();
    let tick = 0;

    while (performance.now() - startedAt < totalMs) {
      const elapsed = performance.now() - startedAt;
      const progress = elapsed / totalMs;
      const delay = forcedVariant || isE2eMode() ? 20 : 45 + progress * progress * 260;
      setDisplayVariant(VARIANT_CYCLE[tick % VARIANT_CYCLE.length]);
      tick += 1;
      await wait(delay);
    }

    finishDraw(finalVariant);
    rollingRef.current = false;
  }, [finishDraw, forcedVariant, guest.avatarDrawn]);

  if (guest.avatarDrawn && !purpleRevealOpen) {
    return (
      <GlangoPurpleRevealOverlay
        open={purpleRevealOpen}
        onClose={() => setPurpleRevealOpen(false)}
      />
    );
  }

  return (
    <>
      <GlangoPurpleRevealOverlay
        open={purpleRevealOpen}
        onClose={() => setPurpleRevealOpen(false)}
      />

      {!guest.avatarDrawn ? (
      <section
        id="glango-draw"
        className={cn(
          "relative overflow-hidden p-4",
          IOS.cardSm,
          "bg-gradient-to-br from-violet-500/[0.07] via-white to-orange-400/[0.06]",
          className
        )}
      >
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600/90">
            {copy.settings.drawEyebrow}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight">
            {copy.settings.drawTitle}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {copy.settings.drawHint}
          </p>

          <div className="mt-5 flex flex-col items-center">
            <div
              className={cn(
                "relative flex size-28 items-center justify-center rounded-[1.75rem] bg-white shadow-md ring-1 ring-black/[0.06]",
                phase === "rolling" && "animate-glango-draw-heartbeat"
              )}
            >
              {phase === "rolling" ? (
                <>
                  <span
                    className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-violet-500/10 animate-ping"
                    aria-hidden
                  />
                  <span
                    className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-violet-400/20 via-transparent to-orange-300/20 animate-glango-draw-glow"
                    aria-hidden
                  />
                </>
              ) : null}
              <GlangoAvatarMark
                variant={displayVariant}
                pixels={76}
                crisp
                className={cn(phase === "rolling" && "animate-glango-draw-spin")}
              />
            </div>

            <p
              className={cn(
                "mt-3 min-h-[1.25rem] text-center text-xs font-semibold transition-opacity",
                phase === "rolling" ? "text-violet-600 animate-pulse" : "text-muted-foreground"
              )}
            >
              {phase === "rolling"
                ? copy.settings.drawRolling
                : copy.settings.drawIdleCaption}
            </p>

            <button
              type="button"
              data-testid="glango-draw-button"
              onClick={() => void runDraw()}
              disabled={phase === "rolling"}
              className={cn(
                "mt-4 w-full py-3.5 text-[15px] font-bold",
                IOS.primaryBtn,
                phase === "rolling" && "pointer-events-none opacity-70"
              )}
            >
              {phase === "rolling"
                ? copy.settings.drawButtonRolling
                : copy.settings.drawButton}
            </button>
          </div>
        </div>
      </section>
      ) : null}
    </>
  );
}
