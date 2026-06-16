"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { GlobeMapProductFocusAction } from "@/components/globe/globe-map-product-focus-card";
import { cn } from "@/lib/utils";

export type GlobeContextMediaFocusCardProps = {
  title: string;
  recallCaption?: string | null;
  primaryAction?: GlobeMapProductFocusAction;
  secondaryAction?: GlobeMapProductFocusAction;
  onClose: () => void;
  closeAriaLabel: string;
  hero: ReactNode;
  heroControls?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchMove?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
};

/** Context photo/video replay — edge-to-edge media, no inner frame. */
export function GlobeContextMediaFocusCard({
  title,
  recallCaption,
  primaryAction,
  secondaryAction,
  onClose,
  closeAriaLabel,
  hero,
  heroControls,
  footer,
  className,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: GlobeContextMediaFocusCardProps) {
  const caption = recallCaption?.trim() || null;
  const showActions = Boolean(primaryAction || secondaryAction);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.15rem] bg-[#1d1d1f] shadow-[0_16px_40px_rgba(0,0,0,0.28)] ring-1 ring-white/10",
        className,
      )}
      data-globe-context-media-focus-card
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative">
        <div className="relative overflow-hidden bg-[#1d1d1f]">{hero}</div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-1.5 top-1.5 z-[4] flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-95"
          aria-label={closeAriaLabel}
        >
          <X className="size-3.5" aria-hidden />
        </button>

        {heroControls ? (
          <div className="absolute left-1.5 top-10 z-[4] flex items-center gap-1.5">
            {heroControls}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2.5 pb-2.5 pt-14">
          <h2 className="line-clamp-2 text-[16px] font-bold leading-tight tracking-tight text-white">
            {title}
          </h2>
          {caption ? (
            <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-white/85">
              {caption}
            </p>
          ) : null}
        </div>
      </div>

      {showActions ? (
        <div className="flex items-center justify-center gap-1.5 bg-[#f5f5f7] px-2.5 py-2">
          {primaryAction ? <MediaFocusAction action={primaryAction} /> : null}
          {secondaryAction ? (
            <MediaFocusAction action={secondaryAction} variant="secondary" />
          ) : null}
        </div>
      ) : null}

      {footer ? (
        <div className="border-t border-white/10 bg-[#f5f5f7] px-2.5 py-1.5 text-center">
          {footer}
        </div>
      ) : null}
    </article>
  );
}

function MediaFocusAction({
  action,
  variant = "primary",
}: {
  action: GlobeMapProductFocusAction;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={(event) => {
        event.stopPropagation();
        action.onClick();
      }}
      className={cn(
        "min-w-[5rem] rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]",
        primary
          ? "bg-[#0071e3] text-white disabled:bg-[#0071e3]/35"
          : "border border-[#0071e3] bg-white text-[#0071e3] disabled:opacity-40",
      )}
    >
      {action.label}
    </button>
  );
}
