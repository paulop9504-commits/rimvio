"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { ContextMediaDeleteButton } from "@/components/globe/context-media-delete-button";
import { ContextMediaVideoSoundButton } from "@/components/globe/context-media-video-sound-button";
import { GlobeMapProductFocusCard } from "@/components/globe/globe-map-product-focus-card";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
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

/** Context media replay — Apple sheet (same rhythm as lodging focus). */
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

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[30] overflow-hidden",
        className,
      )}
      data-globe-context-map-video
    >
      {onDismiss ? (
        <button
          type="button"
          className="pointer-events-auto absolute inset-x-0 top-0 z-[0] h-[11%] min-h-[2.75rem] bg-gradient-to-b from-black/25 to-transparent"
          aria-label={copy.globe.contextMediaFocusCloseAria}
          onClick={dismiss}
        />
      ) : null}

      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-[1] flex flex-col"
        style={{
          top: "max(9%, calc(env(safe-area-inset-top) + 2rem))",
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem))",
        }}
        data-globe-context-map-video-anchor
      >
        <GlobeMapProductFocusCard
          layout="sheet"
          className="h-full min-h-0"
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
                  <p key={line} className="text-[12px] font-normal text-[#86868b]">
                    {line}
                  </p>
                ))}
              </div>
            ) : undefined
          }
          onTouchStart={(event) => {
            event.stopPropagation();
            const touch = event.changedTouches[0] ?? event.touches[0];
            if (!touch) {
              return;
            }
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            event.stopPropagation();
            const start = touchStartRef.current;
            const touch = event.changedTouches[0];
            touchStartRef.current = null;
            if (!start || !touch) {
              return;
            }
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.abs(dx) > Math.abs(dy) || Math.abs(dy) > Math.abs(dx)) {
              handleSwipeEnd(dx, dy);
            }
          }}
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
            <div className="relative flex h-full min-h-[12rem] flex-col bg-[#f5f5f7]">
              <div className="relative min-h-0 flex-1 overflow-hidden bg-[#1d1d1f]">
                {currentItem ? (
                  <MapMediaSlide
                    key={currentItem.id}
                    item={currentItem}
                    playing={playing}
                    onPlayingChange={setPlaying}
                    toggleSoundRef={toggleVideoSoundRef}
                    onSoundOnChange={setVideoSoundOn}
                  />
                ) : null}
              </div>

              {reel.length > 1 ? (
                <div className="flex shrink-0 items-center justify-center gap-2 py-3">
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
                        "size-2 rounded-full transition-colors",
                        index === mediaIndex ? "bg-[#1d1d1f]" : "bg-[#d2d2d7]",
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          }
        />
      </div>
    </div>
  );
}
