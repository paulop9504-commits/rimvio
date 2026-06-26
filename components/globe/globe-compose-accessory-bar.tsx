"use client";

import type { ReactNode } from "react";
import { GlobePortalIntentPeekToggle } from "@/components/globe/globe-portal-intent-peek";
import { cn } from "@/lib/utils";

export type GlobeComposeAccessoryBarProps = {
  portalPeekOpen: boolean;
  onPortalPeekToggle: () => void;
  children?: ReactNode;
  className?: string;
};

/** Pill row above compose — recall on the left, 새 맥락 on the right. */
export function GlobeComposeAccessoryBar({
  portalPeekOpen,
  onPortalPeekToggle,
  children,
  className,
}: GlobeComposeAccessoryBarProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-center justify-between gap-2 px-2 pb-1",
        className,
      )}
      data-globe-compose-accessory-bar
    >
      <div className="flex min-w-0 flex-1 items-center justify-start">{children}</div>
      <GlobePortalIntentPeekToggle open={portalPeekOpen} onToggle={onPortalPeekToggle} />
    </div>
  );
}
