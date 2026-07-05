"use client";

import type { ReactNode } from "react";
import { GlobeMapFocusMediaShell } from "@/components/globe/globe-map-focus-media-shell";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import type { GlobeContextMediaFocusCardFooterAction } from "@/components/globe/globe-context-media-focus-card-types";

export type { GlobeContextMediaFocusCardFooterAction } from "@/components/globe/globe-context-media-focus-card-types";

export type GlobeContextMediaFocusCardProps = {
  title: string;
  recallCaption?: string | null;
  onClose: () => void;
  closeAriaLabel: string;
  hero: ReactNode;
  className?: string;
  onHeroPress?: () => void;
  footerAction?: GlobeContextMediaFocusCardFooterAction | null;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchMove?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
};

/** Map replay — frameless media bubble; metadata on gradient overlay. */
export function GlobeContextMediaFocusCard({
  title,
  recallCaption,
  onClose,
  closeAriaLabel,
  hero,
  className,
  onHeroPress,
  footerAction = null,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: GlobeContextMediaFocusCardProps) {
  return (
    <GlobeMapFocusMediaShell
      title={title}
      caption={recallCaption}
      mediaSlot={hero}
      onClose={onClose}
      closeAriaLabel={closeAriaLabel}
      onHeroPress={onHeroPress}
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      footerAction={
        footerAction ? (
          <GlobeMediaGuideMapExpandButton
            variant="bar"
            label={footerAction.label}
            candidateCount={footerAction.candidateCount}
            onClick={footerAction.onClick}
          />
        ) : null
      }
    />
  );
}
