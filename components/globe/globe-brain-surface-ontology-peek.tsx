"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeMapFocusMediaContextPanel } from "@/components/globe/globe-map-focus-media-context-panel";
import { GlobeMapFocusMediaShell } from "@/components/globe/globe-map-focus-media-shell";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
import { buildBrainSurfaceMapFocusPanelContent } from "@/lib/globe/build-map-focus-media-context-panel";
import {
  GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
  GLOBE_MAP_FOCUS_PIN_ANCHOR_OFFSET_PX,
} from "@/lib/globe/globe-map-focus-hero-layout";
import {
  clampGlobeInfoFramePosition,
  getGlobeInfoFramePreset,
  writeGlobeInfoFrameLayout,
} from "@/lib/globe/brain-surface-floating-frame-layout";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeBrainSurfaceOntologyPeekProps = {
  anchor: BrainSurfaceProjectionCandidate;
  related: readonly BrainSurfaceProjectionCandidate[];
  mediaGuide?: MediaGuideNode | null;
  activeRelatedId?: string | null;
  onSelectRelated: (candidateId: string) => void;
  onExpandMap?: (() => void) | null;
  inferredPlaceCount?: number;
  onOpenDetail?: (() => void) | null;
  mapExpanded?: boolean;
  tracePlaces?: readonly BrainSurfaceProjectionCandidate[];
  onClose: () => void;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  className?: string;
};

export function GlobeBrainSurfaceOntologyPeek({
  anchor,
  related,
  mediaGuide = null,
  activeRelatedId,
  onSelectRelated,
  onExpandMap = null,
  inferredPlaceCount,
  onOpenDetail = null,
  mapExpanded = false,
  tracePlaces = [],
  onClose,
  globeRef,
  className,
}: GlobeBrainSurfaceOntologyPeekProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [youtubeStartSeconds, setYoutubeStartSeconds] = useState<number | null>(null);
  const [panelLayoutSeed, setPanelLayoutSeed] = useState(0);
  const thumb = anchor.markerThumbnailUrl?.trim() || null;
  const embedUrl = anchor.embedUrl?.trim() || null;
  const embedKey = (embedUrl ? extractYouTubeVideoId(embedUrl) : null) ?? anchor.id;

  const panelContent = useMemo(
    () =>
      buildBrainSurfaceMapFocusPanelContent({
        anchor,
        related,
        mediaGuide,
        inferredPlaceCount,
        canExpandMap: Boolean(onExpandMap),
        canOpenDetail: Boolean(onOpenDetail),
      }),
    [anchor, related, mediaGuide, inferredPlaceCount, onExpandMap, onOpenDetail],
  );

  const pinLayout = useGlobePinScreenAnchor({
    globeRef: globeRef ?? { current: null },
    lat: anchor.lat,
    lng: anchor.lng,
    enabled: Boolean(embedUrl || thumb),
    containerRef,
  });
  const pinAnchored = pinLayout?.onScreen === true;

  useEffect(() => {
    if (!pinLayout?.onScreen) {
      return;
    }
    const preset = getGlobeInfoFramePreset("brain-surface-info");
    const width = preset.defaultWidth;
    const height = preset.defaultHeight;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    let left = pinLayout.x + 108;
    let top = pinLayout.y - height * 0.35;
    if (left + width > viewport.width - 12) {
      left = pinLayout.x - width - 108;
    }
    if (left < 12) {
      left = Math.max(12, (viewport.width - width) / 2);
      top = pinLayout.y + 72;
    }
    const clamped = clampGlobeInfoFramePosition({
      left,
      top,
      width,
      height,
      viewport,
    });
    writeGlobeInfoFrameLayout("brain-surface-info", {
      ...clamped,
      width,
      height,
    });
    setPanelLayoutSeed((value) => value + 1);
  }, [anchor.id, pinLayout?.onScreen, pinLayout?.x, pinLayout?.y]);

  const handlePrimaryAction = useCallback(() => {
    const action = panelContent.primaryAction;
    if (!action) {
      return;
    }
    if (action.kind === "expand_map") {
      onExpandMap?.();
      return;
    }
    if (action.kind === "play_moment") {
      const seconds = panelContent.sceneMoments[0]?.seconds;
      if (seconds != null) {
        setYoutubeStartSeconds(seconds);
      }
      return;
    }
    if (action.kind === "open_detail") {
      onOpenDetail?.();
    }
  }, [onExpandMap, onOpenDetail, panelContent.primaryAction, panelContent.sceneMoments]);

  const handleSecondaryAction = useCallback(() => {
    const action = panelContent.secondaryAction;
    if (!action) {
      return;
    }
    if (action.kind === "play_moment") {
      const seconds = panelContent.sceneMoments[0]?.seconds;
      if (seconds != null) {
        setYoutubeStartSeconds(seconds);
      }
      return;
    }
    if (action.kind === "open_detail") {
      onOpenDetail?.();
    }
  }, [onOpenDetail, panelContent.sceneMoments, panelContent.secondaryAction]);

  const framelessVideo = (
    <GlobeMapFocusMediaShell
      className={GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS}
      variant="frameless"
      showMetadataOverlay={false}
      title={anchor.label}
      thumbnailUrl={thumb}
      youtubeEmbedUrl={embedUrl}
      youtubeVideoKey={`${embedKey}:${youtubeStartSeconds ?? 0}`}
      youtubeStartSeconds={youtubeStartSeconds}
      autoPlay
      onClose={onClose}
      closeAriaLabel={copy.globe.brainSurfaceStoryCloseAria}
    />
  );

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 z-[31] overflow-hidden", className)}
      data-globe-brain-surface-ontology-peek
    >
      {pinAnchored && pinLayout ? (
        <div
          className="pointer-events-auto absolute z-[1]"
          style={{
            left: pinLayout.x,
            top: pinLayout.y,
            transform: `translate(-50%, calc(-100% - ${GLOBE_MAP_FOCUS_PIN_ANCHOR_OFFSET_PX}px))`,
          }}
          data-globe-brain-surface-ontology-video-anchor
        >
          {framelessVideo}
        </div>
      ) : (
        <div
          className="pointer-events-auto absolute inset-x-0 top-[min(18vh,7.5rem)] z-[1] flex justify-center px-3"
          data-globe-brain-surface-ontology-video-fallback
        >
          {framelessVideo}
        </div>
      )}

      <GlobeBrainSurfaceFloatingFrame
        key={`${anchor.id}:${panelLayoutSeed}`}
        frameId="brain-surface-info"
        dragLabel="맥락 정보 이동"
        floating
        shellClassName="overflow-hidden rounded-b-[1rem] rounded-t-none border border-t-0 border-white/85 bg-transparent text-slate-900 shadow-none ring-0"
        bodyClassName="p-0"
      >
        <GlobeMapFocusMediaContextPanel
          content={panelContent}
          onClose={onClose}
          closeAriaLabel={copy.globe.brainSurfaceStoryCloseAria}
          onPrimaryAction={handlePrimaryAction}
          onSecondaryAction={handleSecondaryAction}
          onMomentPress={(seconds) => setYoutubeStartSeconds(seconds)}
        >
          {mapExpanded && tracePlaces.length > 0 ? (
            <div className="space-y-1.5">
              {tracePlaces.map((place) => {
                const active = place.id === activeRelatedId;
                return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => onSelectRelated(place.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-full bg-slate-50 px-2.5 py-2 text-left ring-1 ring-slate-200/80 active:scale-[0.99]",
                    active && "ring-2 ring-[#0071e3]/35",
                  )}
                >
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      place.anchorKind === "video_root"
                        ? "bg-violet-500"
                        : "bg-[#0071e3]",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-800">
                    {place.label}
                  </span>
                </button>
                );
              })}
            </div>
          ) : null}
        </GlobeMapFocusMediaContextPanel>
      </GlobeBrainSurfaceFloatingFrame>
    </div>
  );
}
