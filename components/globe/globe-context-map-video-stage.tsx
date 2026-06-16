"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { ContextMediaDeleteButton } from "@/components/globe/context-media-delete-button";
import { ContextMediaVideoSoundButton } from "@/components/globe/context-media-video-sound-button";
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
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { cn } from "@/lib/utils";
import {
  dispatchGlobeMapMediaFocus,
} from "@/lib/globe/globe-map-media-focus-bridge";

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
        className="pointer-events-none relative z-0 aspect-[4/5] w-full object-cover"
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
        className="pointer-events-none relative z-0 aspect-[4/5] w-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center bg-black/80 px-3 text-center text-[12px] font-medium text-white/70">
      {loading || item.pendingRemote
        ? `${item.kind === "video" ? "동영상" : "사진"} 불러오는 중…`
        : item.label}
    </div>
  );
}

/** Pin-anchored context media — swipe ↔ reel, swipe ↕ next context. */
export function GlobeContextMapVideoStage({
  eventId,
  anchorLat,
  anchorLng,
  globeRef,
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
  const skipNextTapRef = useRef(false);
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

  const handleSwipeEnd = useCallback(
    (dx: number, dy: number) => {
      if (Math.abs(dx) < SWIPE_MIN_PX && Math.abs(dy) < SWIPE_MIN_PX) {
        return false;
      }
      skipNextTapRef.current = true;

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

  const openDetailsFromTap = useCallback(
    (event?: { stopPropagation: () => void }) => {
      event?.stopPropagation();
      onOpenDetails?.();
    },
    [onOpenDetails],
  );

  if (!visible || reel.length === 0) {
    return null;
  }

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
          className="pointer-events-auto absolute inset-0 z-[0] bg-black/50 backdrop-blur-md"
          aria-label="닫기"
          onClick={onDismiss}
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 z-[1] flex flex-col items-center justify-center px-4"
        style={{
          top: "max(3rem, env(safe-area-inset-top))",
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.75rem)",
        }}
        data-globe-context-map-video-anchor
      >
        <div
          className={cn(
            "relative w-full max-w-[380px] touch-pan-y overflow-hidden rounded-[1.35rem]",
            "bg-black shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/15",
            "pointer-events-auto",
            onOpenDetails && "cursor-pointer",
          )}
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
            if (Math.abs(dx) < SWIPE_MIN_PX && Math.abs(dy) < SWIPE_MIN_PX) {
              if ((event.target as HTMLElement).closest("button")) {
                return;
              }
              skipNextTapRef.current = true;
              openDetailsFromTap(event);
              return;
            }
            handleSwipeEnd(dx, dy);
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (skipNextTapRef.current) {
              skipNextTapRef.current = false;
              return;
            }
            if ((event.target as HTMLElement).closest("button")) {
              return;
            }
            openDetailsFromTap(event);
          }}
        >
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
          {onDismiss ? (
            <button
              type="button"
              className="pointer-events-auto absolute right-2 top-2 z-[3] flex size-8 items-center justify-center rounded-full bg-black/55 text-[11px] font-semibold text-white backdrop-blur-sm"
              aria-label="닫기"
              onClick={(event) => {
                event.stopPropagation();
                onDismiss();
              }}
            >
              ×
            </button>
          ) : null}
          {reel.length > 1 ? (
            <span className="pointer-events-none absolute left-2 top-2 z-[2] rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              {mediaIndex + 1}/{reel.length}
            </span>
          ) : null}
          {currentItem?.kind === "video" ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8">
              <div className="pointer-events-auto flex min-w-0 items-center gap-1">
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
                {eventId && deletable ? (
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
              <button
                type="button"
                className="pointer-events-auto shrink-0 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  setPlaying((value) => !value);
                }}
              >
                {playing ? "일시정지" : "재생"}
              </button>
            </div>
          ) : null}
          {currentItem &&
          currentItem.kind !== "video" &&
          eventId &&
          deletable ? (
            <ContextMediaDeleteButton
              item={currentItem}
              eventId={eventId}
              viewerUserId={viewerUserId}
              enabled={deletable}
              className="bottom-2 right-2 size-8"
              onDeleted={handleMediaDeleted}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
