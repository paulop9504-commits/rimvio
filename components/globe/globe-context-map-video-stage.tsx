"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { ContextMediaDeleteButton } from "@/components/globe/context-media-delete-button";
import { ContextMediaVideoSoundButton } from "@/components/globe/context-media-video-sound-button";
import { GlobeMapProductFocusCard } from "@/components/globe/globe-map-product-focus-card";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobeMapMediaCardSize } from "@/hooks/use-globe-map-media-card-size";
import { useGlobeContextVideoSound } from "@/hooks/use-globe-context-video-sound";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import { resolveGlobeContextNavigationStep } from "@/lib/globe/list-globe-context-navigation-order";
import {
  projectContextMediaReel,
  type ContextMediaReelItem,
} from "@/lib/globe/project-context-media-reel";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { resolveExperienceVolumeForEvent } from "@/lib/globe/resolve-globe-context-primary-video";
import { dispatchGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const SWIPE_MIN_PX = 44;

export type GlobeContextMapVideoStageProps = {
  eventId: string | null | undefined;
  anchorLat?: number | null;
  anchorLng?: number | null;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  visible?: boolean;
  navigationEntries?: readonly GlobeContextTimelineEntry[];
  onDismiss?: () => void;
  onOpenDetails?: () => void;
  onNavigateContext?: (eventId: string) => void;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
  className?: string;
};

function MapMediaSlide({
  item,
  playing,
  onPlayingChange,
  toggleSoundRef,
  onSoundOnChange,
}: {
  item: ContextMediaReelItem;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  toggleSoundRef: RefObject<(() => void) | null>;
  onSoundOnChange?: (soundOn: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { url: blobUrl, loading } = useMediaBlobUrl(
    item.allowLocalBlob === true ? item.mediaContextId : null,
  );
  const src = item.imageUrl ?? blobUrl;
  const isVideo = item.kind === "video";

  const { toggleSound, soundOn } = useGlobeContextVideoSound({
    videoRef,
    src,
    isVideo,
    playing,
    soundByDefault: false,
    onPlayFailed: () => onPlayingChange(false),
  });

  useEffect(() => {
    toggleSoundRef.current = toggleSound;
  }, [toggleSound, toggleSoundRef]);

  useEffect(() => {
    onSoundOnChange?.(soundOn);
  }, [onSoundOnChange, soundOn]);

  if (src && isVideo) {
    return (
      <video
        ref={videoRef}
        key={`${item.id}:${src}`}
        src={src}
        className="pointer-events-none size-full object-cover object-center"
        playsInline
        loop
        autoPlay
        preload="metadata"
      />
    );
  }

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`${item.id}:${src}`}
        src={src}
        alt=""
        className="pointer-events-none size-full object-cover object-center"
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center bg-[#e8e8ed] px-3 text-center text-[13px] font-normal text-[#86868b]">
      {loading || item.pendingRemote
        ? `${item.kind === "video" ? "동영상" : "사진"} 불러오는 중…`
        : item.label}
    </div>
  );
}

/** Context media replay — floating card (lodging style) + user resize. */
export function GlobeContextMapVideoStage({
  eventId,
  visible = true,
  navigationEntries = [],
  onDismiss,
  onOpenDetails,
  onNavigateContext,
  viewerUserId,
  deletable = false,
  onMediaDeleted,
  className,
}: GlobeContextMapVideoStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const toggleVideoSoundRef = useRef<(() => void) | null>(null);
  const [revision, setRevision] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [videoSoundOn, setVideoSoundOn] = useState(false);
  const {
    widthPx,
    pinchActiveRef,
    isResizing,
    onResizeHandlePointerDown,
    onResizeHandlePointerMove,
    onResizeHandlePointerUp,
    onCardTouchStart,
    onCardTouchMove,
    onCardTouchEnd,
  } = useGlobeMapMediaCardSize();

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    void hydrateMediaContextStore().then(() => bump());
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, bump);
    };
  }, []);

  const reel = useMemo(() => {
    void revision;
    const key = eventId?.trim();
    if (!key) {
      return [] as ContextMediaReelItem[];
    }
    const event =
      findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
    const volume = resolveExperienceVolumeForEvent(key);
    return projectContextMediaReel({ event, volume, viewerUserId });
  }, [eventId, revision, viewerUserId]);

  const activeEvent = useMemo(() => {
    const key = eventId?.trim();
    if (!key) {
      return null;
    }
    return findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
  }, [eventId]);

  const contextTitle = useMemo(() => {
    if (!activeEvent) {
      return copy.globe.contextMediaFocusFallbackTitle;
    }
    return (
      activeEvent.place?.trim() ||
      activeEvent.title.trim() ||
      copy.globe.contextMediaFocusFallbackTitle
    );
  }, [activeEvent]);

  useEffect(() => {
    setMediaIndex(0);
    setPlaying(true);
    setVideoSoundOn(false);
  }, [eventId]);

  useEffect(() => {
    setVideoSoundOn(false);
  }, [mediaIndex]);

  useEffect(() => {
    if (mediaIndex >= reel.length) {
      setMediaIndex(Math.max(0, reel.length - 1));
    }
  }, [mediaIndex, reel.length]);

  useEffect(() => {
    const active = visible && reel.length > 0;
    dispatchGlobeMapMediaFocus(active, "video");
    return () => {
      dispatchGlobeMapMediaFocus(false, "video");
    };
  }, [reel.length, visible]);

  const currentItem = reel[mediaIndex] ?? null;
  const canNavigateContext = navigationEntries.length > 1 && Boolean(onNavigateContext);

  const handleSwipeEnd = useCallback(
    (dx: number, dy: number) => {
      if (Math.abs(dx) < SWIPE_MIN_PX && Math.abs(dy) < SWIPE_MIN_PX) {
        return false;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          setMediaIndex((index) => Math.max(0, index - 1));
        } else {
          setMediaIndex((index) => Math.min(reel.length - 1, index + 1));
        }
        return true;
      }

      const key = eventId?.trim();
      if (!key || !onNavigateContext || navigationEntries.length === 0) {
        return true;
      }

      const step = resolveGlobeContextNavigationStep({
        entries: navigationEntries,
        currentEventId: key,
        direction: dy < 0 ? "next" : "prev",
      });
      if (step?.eventId && step.eventId !== key) {
        onNavigateContext(step.eventId);
      }
      return true;
    },
    [eventId, navigationEntries, onNavigateContext, reel.length],
  );

  const handleMediaDeleted = useCallback(() => {
    setRevision((value) => value + 1);
    onMediaDeleted?.();
  }, [onMediaDeleted]);

  const dismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  if (!visible || reel.length === 0) {
    return null;
  }

  const subtitle = currentItem?.recallCaption?.trim() || null;
  const footerLines = [
    reel.length > 1 ? copy.globe.contextMediaFocusSwipeMedia : null,
    canNavigateContext ? copy.globe.contextMediaFocusSwipeContext : null,
  ].filter(Boolean);

  const mergeCardTouchStart = (event: React.TouchEvent) => {
    event.stopPropagation();
    onCardTouchStart(event);
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      if (touch) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const mergeCardTouchMove = (event: React.TouchEvent) => {
    event.stopPropagation();
    onCardTouchMove(event);
  };

  const mergeCardTouchEnd = (event: React.TouchEvent) => {
    event.stopPropagation();
    onCardTouchEnd(event);
    if (pinchActiveRef.current || isResizing()) {
      touchStartRef.current = null;
      return;
    }
    if ((event.target as HTMLElement).closest("[data-globe-map-media-resize-handle]")) {
      touchStartRef.current = null;
      return;
    }
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) {
      return;
    }
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    handleSwipeEnd(dx, dy);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[30] overflow-hidden",
        className,
      )}
      data-globe-context-map-video
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-[0] bg-black/45 backdrop-blur-md"
        aria-label={copy.globe.contextMediaFocusCloseAria}
        onClick={dismiss}
      />

      <div
        className="pointer-events-none absolute inset-x-0 z-[1] flex flex-col items-center justify-center px-3"
        style={{
          top: "max(2.5rem, env(safe-area-inset-top))",
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.5rem)",
        }}
        data-globe-context-map-video-anchor
      >
        <div
          className="pointer-events-auto w-full max-w-[calc(100vw-1.5rem)]"
          style={{ width: widthPx }}
          data-globe-map-media-card-width={widthPx}
        >
          <GlobeMapProductFocusCard
            layout="card"
            className="w-full"
            title={contextTitle}
            subtitle={subtitle}
            primaryAction={{
              label: copy.globe.lodgingFocusDetails,
              onClick: () => onOpenDetails?.(),
              disabled: !onOpenDetails,
            }}
            secondaryAction={
              currentItem?.kind === "video"
                ? {
                    label: playing
                      ? copy.globe.contextMediaFocusPause
                      : copy.globe.contextMediaFocusPlay,
                    onClick: () => setPlaying((value) => !value),
                    variant: "secondary",
                  }
                : undefined
            }
            onClose={dismiss}
            closeAriaLabel={copy.globe.contextMediaFocusCloseAria}
            footer={
              footerLines.length > 0 ? (
                <div className="space-y-0.5">
                  {footerLines.map((line) => (
                    <p key={line} className="text-[11px] font-normal text-[#86868b]">
                      {line}
                    </p>
                  ))}
                </div>
              ) : undefined
            }
            onTouchStart={mergeCardTouchStart}
            onTouchMove={mergeCardTouchMove}
            onTouchEnd={mergeCardTouchEnd}
            belowHero={
              currentItem?.kind === "video" || (deletable && eventId && currentItem) ? (
                <div className="flex items-center justify-center gap-2 py-0.5">
                  {currentItem?.kind === "video" ? (
                    <ContextMediaVideoSoundButton
                      soundOn={videoSoundOn}
                      variant="pill"
                      onToggleSound={() => {
                        toggleVideoSoundRef.current?.();
                        if (!playing) {
                          setPlaying(true);
                        }
                      }}
                    />
                  ) : null}
                  {eventId && deletable && currentItem ? (
                    <ContextMediaDeleteButton
                      item={currentItem}
                      eventId={eventId}
                      viewerUserId={viewerUserId}
                      enabled={deletable}
                      className="relative bottom-auto left-auto size-8 shrink-0"
                      onDeleted={handleMediaDeleted}
                    />
                  ) : null}
                </div>
              ) : undefined
            }
            hero={
              <div className="relative overflow-hidden rounded-[0.9rem] bg-[#e8e8ed]">
                {currentItem ? (
                  <div className="aspect-[4/5] w-full">
                    <MapMediaSlide
                      key={currentItem.id}
                      item={currentItem}
                      playing={playing}
                      onPlayingChange={setPlaying}
                      toggleSoundRef={toggleVideoSoundRef}
                      onSoundOnChange={setVideoSoundOn}
                    />
                  </div>
                ) : null}

                {reel.length > 1 ? (
                  <div className="absolute inset-x-0 bottom-2 z-[2] flex justify-center gap-1.5">
                    {reel.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`${index + 1}`}
                        aria-current={index === mediaIndex}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMediaIndex(index);
                        }}
                        className={cn(
                          "size-1.5 rounded-full shadow-sm",
                          index === mediaIndex ? "bg-white" : "bg-white/45",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            }
          />

          <button
            type="button"
            className="mt-1.5 flex w-full touch-none flex-col items-center gap-1 rounded-full py-2 active:opacity-80"
            aria-label={copy.globe.contextMediaFocusResizeAria}
            data-globe-map-media-resize-handle
            onPointerDown={onResizeHandlePointerDown}
            onPointerMove={onResizeHandlePointerMove}
            onPointerUp={onResizeHandlePointerUp}
            onPointerCancel={onResizeHandlePointerUp}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="h-1 w-10 rounded-full bg-white/70 shadow-sm" aria-hidden />
            <span className="text-[10px] font-normal text-white/80">
              {copy.globe.contextMediaFocusResizeHint}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
