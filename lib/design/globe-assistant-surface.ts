/**
 * Globe assistant surfaces — Composer · 맥락 AI · Ask sheet (SSOT).
 * Aligns with `rimvio-ontology` (#0071e3 action · #1d1d1f ink · #f5f5f7 muted).
 */
import { cn } from "@/lib/utils";
import {
  RIMVIO_ACTION,
  RIMVIO_INK,
  RIMVIO_RADIUS,
  RIMVIO_SURFACE,
} from "@/lib/design/rimvio-ontology";

/** Above PinOpenSheet (`z-[10062]`) while assistant is active. */
export const RIMVIO_ASSISTANT_FRAME_Z_INDEX = 10070;

/** Discovery feed browsing — assistant retreats behind the feed. */
export const RIMVIO_ASSISTANT_FEED_BACKDROP_Z_INDEX = 18;

export const RIMVIO_ASSISTANT = {
  ink: RIMVIO_INK,
  action: RIMVIO_ACTION,
  surface: RIMVIO_SURFACE,
  /** Soft ambient wash behind ask sheet */
  sheetGlow:
    "from-[#0071e3]/[0.06] via-[#5ac8fa]/[0.04] to-transparent",
  /** Pin ↔ frame connector gradient stops */
  linkGradient: {
    from: RIMVIO_ACTION.primary,
    to: RIMVIO_INK.secondary,
  },
} as const;

export type AssistantHintTone = "neutral" | "success" | "error";

/** Floating 맥락 AI frame shell */
export function rimvioAssistantFrameShellClass(className?: string) {
  return cn(
    "overflow-hidden rounded-[1.15rem] bg-white/84 backdrop-blur-xl",
    "shadow-[0_18px_48px_rgba(15,23,42,0.11)] ring-1 ring-black/[0.05]",
    className,
  );
}

/** Ask / capture sheet shell */
export function rimvioAssistantSheetShellClass(className?: string) {
  return cn(
    "flex flex-col overflow-hidden rounded-t-[28px] bg-[#f5f5f7]",
    "shadow-[0_-12px_48px_rgba(15,23,42,0.10)]",
    className,
  );
}

/** Sheet bottom ambient glow */
export function rimvioAssistantSheetGlowClass(className?: string) {
  return cn(
    "pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t",
    RIMVIO_ASSISTANT.sheetGlow,
    className,
  );
}

export function rimvioAssistantEyebrowClass(className?: string) {
  return cn(
    "text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]",
    className,
  );
}

export function rimvioAssistantTitleClass(className?: string) {
  return cn("text-[14px] font-semibold text-[#1d1d1f]", className);
}

export function rimvioAssistantBodyClass(className?: string) {
  return cn("text-[13px] font-medium leading-relaxed text-[#1d1d1f]", className);
}

export function rimvioAssistantMetaClass(className?: string) {
  return cn("text-[11px] leading-relaxed text-[#86868b]", className);
}

/** Preflight / assistant speech bubble */
export function rimvioAssistantSpeechBubbleClass(className?: string) {
  return cn(
    "rounded-[1rem] rounded-tl-md bg-[#f5f5f7] px-3 py-2.5 ring-1 ring-black/[0.04]",
    className,
  );
}

/** Interpretation / plan card */
export function rimvioAssistantInsightCardClass(className?: string) {
  return cn(
    "space-y-2.5 rounded-2xl border border-[#0071e3]/10 bg-[#0071e3]/[0.035] px-3 py-2.5",
    className,
  );
}

export function rimvioAssistantInsightEyebrowClass(className?: string) {
  return cn(
    "text-[10px] font-medium uppercase tracking-[0.08em] text-[#0071e3]/75",
    className,
  );
}

export function rimvioAssistantConnectedBadgeClass(className?: string) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full bg-[#0071e3]/10 px-2 py-0.5 ring-1 ring-[#0071e3]/18",
    className,
  );
}

export function rimvioAssistantConnectedDotClass(className?: string) {
  return cn("size-1.5 shrink-0 rounded-full bg-[#0071e3]", className);
}

export function rimvioAssistantConnectedLabelClass(className?: string) {
  return cn("text-[10px] font-semibold text-[#0071e3]", className);
}

export function rimvioAssistantStatusActiveClass(className?: string) {
  return cn("font-medium text-[#0071e3]/90", className);
}

/** Process strip step states */
export function rimvioAssistantProcessStepClass(
  state: "done" | "active" | "pending",
  className?: string,
) {
  return cn(
    "flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] leading-snug",
    state === "active" && "bg-[#0071e3]/10 font-medium text-[#0071e3]",
    state === "done" && "text-[#86868b]",
    state === "pending" && "text-[#c7c7cc]",
    className,
  );
}

export function rimvioAssistantProcessBadgeClass(
  state: "done" | "active" | "pending",
  className?: string,
) {
  return cn(
    "flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
    state === "active" && "bg-[#0071e3] text-white",
    state === "done" && "bg-[#0071e3]/12 text-[#0071e3]",
    state === "pending" && "bg-black/[0.04] text-[#c7c7cc]",
    className,
  );
}

/** Refine chip */
export function rimvioAssistantRefineChipClass(className?: string) {
  return cn(
    RIMVIO_RADIUS.pill,
    "bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f]",
    "ring-1 ring-black/[0.06] active:scale-[0.98]",
    "active:bg-[#0071e3]/10 active:text-[#0071e3] disabled:opacity-45",
    className,
  );
}

/** Chat bubbles — ask sheet */
export function rimvioAssistantUserBubbleClass(className?: string) {
  return cn(
    "max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-md",
    "bg-[#1d1d1f] px-4 py-2.5 text-[15px] leading-relaxed text-white",
    "shadow-[0_2px_10px_rgba(0,0,0,0.12)]",
    className,
  );
}

export function rimvioAssistantAiBubbleClass(className?: string) {
  return cn(
    "max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-bl-md",
    "bg-white px-4 py-2.5 text-[15px] leading-relaxed text-[#1d1d1f]",
    "shadow-[0_1px_4px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]",
    className,
  );
}

export function rimvioAssistantAiBubbleMutedClass(className?: string) {
  return cn(
    "max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-bl-md",
    "bg-white px-4 py-2.5 text-[15px] leading-relaxed text-[#515154]",
    "shadow-[0_1px_4px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]",
    className,
  );
}

export function rimvioAssistantNarrativeClass(className?: string) {
  return cn(
    "whitespace-pre-wrap text-[15px] leading-relaxed text-[#1d1d1f]",
    className,
  );
}

/** Composer hint strip above ingest bar */
export function rimvioAssistantHintClass(
  tone: AssistantHintTone,
  options?: { mapDark?: boolean; lightPill?: boolean },
  className?: string,
) {
  const { mapDark = false, lightPill = false } = options ?? {};
  const base =
    "max-w-[min(100%,20rem)] text-center text-[11px] font-medium leading-snug line-clamp-2 rounded-full px-2.5 py-1";

  if (lightPill) {
    if (tone === "error") {
      return cn(base, "bg-[#fee2e2]/95 text-[#b91c1c] ring-1 ring-[#fecaca]", className);
    }
    if (tone === "success") {
      return cn(
        base,
        "bg-[#ecfdf3]/95 text-[#15803d] ring-1 ring-[#bbf7d0]",
        className,
      );
    }
    return cn(base, "bg-white/92 text-[#86868b] ring-1 ring-black/[0.06]", className);
  }

  if (mapDark) {
    if (tone === "error") {
      return cn(
        base,
        "bg-[#3f1515]/88 text-[#fca5a5] ring-1 ring-[#ef4444]/25",
        className,
      );
    }
    if (tone === "success") {
      return cn(
        base,
        "bg-[#0f2918]/88 text-[#86efac] ring-1 ring-[#22c55e]/25",
        className,
      );
    }
    return cn(base, "bg-[#121316]/78 text-white/72 ring-1 ring-white/12", className);
  }

  if (tone === "error") {
    return cn(base, "bg-[#fee2e2] text-[#b91c1c]", className);
  }
  if (tone === "success") {
    return cn(base, "bg-[#ecfdf3] text-[#15803d]", className);
  }
  return cn(base, "bg-white/90 text-[#86868b] ring-1 ring-black/[0.05]", className);
}

export function rimvioAssistantTypewriterCursorClass(className?: string) {
  return cn(
    "ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[#0071e3]/70 align-[-0.1em]",
    className,
  );
}

export function rimvioAssistantHeroTitleClass(className?: string) {
  return cn(
    "text-center text-[22px] font-bold leading-snug tracking-tight text-[#1d1d1f]",
    className,
  );
}

export function rimvioAssistantHeroHintClass(className?: string) {
  return cn("text-center text-[15px] font-medium text-[#0071e3]/85", className);
}
