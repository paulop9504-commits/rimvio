"use client";

import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import type { MapFocusMediaContextPanelContent } from "@/lib/globe/build-map-focus-media-context-panel";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeMapFocusMediaContextPanelProps = {
  content: MapFocusMediaContextPanelContent;
  children?: ReactNode;
  onClose?: () => void;
  closeAriaLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onMomentPress?: (seconds: number) => void;
  className?: string;
};

function PanelSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      {children}
    </section>
  );
}

/** Detached map media context — why here · scene · connections · one primary action. */
export function GlobeMapFocusMediaContextPanel({
  content,
  children,
  onClose,
  closeAriaLabel = copy.globe.brainSurfaceStoryCloseAria,
  onPrimaryAction,
  onSecondaryAction,
  onMomentPress,
  className,
}: GlobeMapFocusMediaContextPanelProps) {
  const {
    whyHereLine,
    sceneMoments,
    sceneFootnote,
    trustLine,
    connectionSummaryLine,
    primaryAction,
    secondaryAction,
  } = content;

  return (
    <article
      className={cn(
        "flex max-h-full min-h-0 flex-col overflow-hidden rounded-[1rem] border border-white/85 bg-white/94 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] backdrop-blur-2xl",
        className,
      )}
      data-globe-map-focus-media-context-panel
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-200/70 px-3 py-2.5">
        <p className="text-[11px] font-semibold text-slate-500">
          {copy.globe.mapFocusMediaContextPanelEyebrow}
        </p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 active:scale-[0.97]"
            aria-label={closeAriaLabel}
          >
            {copy.globe.brainSurfaceStoryCloseAria}
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-3 py-3">
        <PanelSection label={copy.globe.mapFocusMediaWhyHereSection}>
          <p className="text-[15px] font-semibold leading-snug text-slate-900">{whyHereLine}</p>
          {trustLine ? (
            <p className="text-[11px] font-medium text-slate-500">{trustLine}</p>
          ) : null}
        </PanelSection>

        {sceneMoments.length > 0 || sceneFootnote ? (
          <PanelSection label={copy.globe.mapFocusMediaSceneSection}>
            {sceneMoments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {sceneMoments.map((moment) => (
                  <button
                    key={`${moment.timeLabel}:${moment.label}`}
                    type="button"
                    disabled={moment.seconds == null || !onMomentPress}
                    onClick={() => {
                      if (moment.seconds != null) {
                        onMomentPress?.(moment.seconds);
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200/80",
                      moment.seconds != null &&
                        onMomentPress &&
                        "active:scale-[0.98] active:bg-slate-200/80",
                      (moment.seconds == null || !onMomentPress) && "cursor-default",
                    )}
                  >
                    <span className="tabular-nums text-[#0071e3]">{moment.timeLabel}</span>
                    <span className="line-clamp-1">{moment.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {sceneFootnote ? (
              <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                {sceneFootnote}
              </p>
            ) : null}
          </PanelSection>
        ) : null}

        {connectionSummaryLine || children ? (
          <PanelSection label={copy.globe.mapFocusMediaConnectionsSection}>
            {connectionSummaryLine ? (
              <p className="text-[12px] font-medium leading-relaxed text-slate-700">
                {connectionSummaryLine}
              </p>
            ) : null}
            {children}
          </PanelSection>
        ) : null}
      </div>

      {primaryAction || secondaryAction ? (
        <div className="shrink-0 space-y-2 border-t border-slate-200/70 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {copy.globe.mapFocusMediaActionsSection}
          </p>
          {primaryAction ? (
            primaryAction.kind === "expand_map" ? (
              <GlobeMediaGuideMapExpandButton
                variant="bar"
                label={primaryAction.label}
                candidateCount={primaryAction.candidateCount}
                onClick={() => onPrimaryAction?.()}
                className="w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => onPrimaryAction?.()}
                className="flex w-full min-h-10 items-center justify-center gap-1.5 rounded-full bg-[#0071e3] px-3 py-2.5 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.28)] active:scale-[0.98]"
              >
                {primaryAction.kind === "play_moment" ? (
                  <Play className="size-3.5" aria-hidden />
                ) : null}
                {primaryAction.label}
              </button>
            )
          ) : null}
          {secondaryAction ? (
            <button
              type="button"
              onClick={() => onSecondaryAction?.()}
              className="w-full text-center text-[11px] font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 active:text-slate-700"
            >
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
