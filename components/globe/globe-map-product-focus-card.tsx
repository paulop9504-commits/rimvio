"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GlobeMapProductFocusAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

export type GlobeMapProductFocusCardProps = {
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  primaryAction: GlobeMapProductFocusAction;
  secondaryAction?: GlobeMapProductFocusAction;
  onClose: () => void;
  closeAriaLabel: string;
  hero: ReactNode;
  belowHero?: ReactNode;
  headerExtra?: ReactNode;
  className?: string;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
};

/** Apple-style map focus card — copy + pill CTAs, hero media below. */
export function GlobeMapProductFocusCard({
  title,
  subtitle,
  eyebrow,
  primaryAction,
  secondaryAction,
  onClose,
  closeAriaLabel,
  hero,
  belowHero,
  headerExtra,
  className,
  onTouchStart,
  onTouchEnd,
}: GlobeMapProductFocusCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.35rem] bg-[#f5f5f7] shadow-[0_20px_50px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06]",
        className,
      )}
      data-globe-map-product-focus-card
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative px-4 pb-3 pt-3.5 text-center">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-black/[0.06] text-[#1d1d1f]/70"
          aria-label={closeAriaLabel}
        >
          <X className="size-3.5" aria-hidden />
        </button>

        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-[#6e6e73]">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="line-clamp-2 px-6 text-[20px] font-bold leading-tight tracking-tight text-[#1d1d1f]">
          {title}
        </h2>

        {subtitle ? (
          <p className="mt-1.5 line-clamp-2 px-1 text-[13px] font-medium leading-snug text-[#6e6e73]">
            {subtitle}
          </p>
        ) : null}

        {headerExtra}

        <div className="mt-3.5 flex items-center justify-center gap-2">
          <FocusActionButton action={primaryAction} />
          {secondaryAction ? <FocusActionButton action={secondaryAction} /> : null}
        </div>
      </div>

      <div className="bg-[#f5f5f7] px-3 pb-3">{hero}</div>

      {belowHero ? (
        <div className="border-t border-black/[0.06] bg-white/80 px-3 py-2.5">{belowHero}</div>
      ) : null}
    </div>
  );
}

function FocusActionButton({ action }: { action: GlobeMapProductFocusAction }) {
  const primary = action.variant !== "secondary";
  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={(event) => {
        event.stopPropagation();
        action.onClick();
      }}
      className={cn(
        "min-w-[5.5rem] rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]",
        primary
          ? "bg-[#0071e3] text-white shadow-sm disabled:bg-[#0071e3]/40"
          : "border border-[#0071e3]/80 bg-white text-[#0071e3] disabled:opacity-40",
      )}
    >
      {action.label}
    </button>
  );
}
