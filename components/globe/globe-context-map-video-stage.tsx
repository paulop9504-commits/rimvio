"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import { resolveGlobeContextPrimaryVideo } from "@/lib/globe/resolve-globe-context-primary-video";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { cn } from "@/lib/utils";

export type GlobeContextMapVideoStageProps = {
  eventId: string | null | undefined;
  visible?: boolean;
  onDismiss?: () => void;
  className?: string;
};

/** Map center — replays the context video while a pin context is selected. */
export function GlobeContextMapVideoStage({
  eventId,
  visible = true,
  onDismiss,
  className,
}: GlobeContextMapVideoStageProps) {
  const [revision, setRevision] = useState(0);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const primaryVideo = useMemo(() => {
    void revision;
    const key = eventId?.trim();
    if (!key) {
      return null;
    }
    const event =
      findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
    return resolveGlobeContextPrimaryVideo(event);
  }, [eventId, revision]);

  const { url: mediaUrl, loading } = useMediaBlobUrl(
    primaryVideo?.mediaContextId,
  );

  useEffect(() => {
    setPlaying(true);
  }, [primaryVideo?.mediaContextId]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !mediaUrl) {
      return;
    }
    if (playing) {
      void node.play().catch(() => setPlaying(false));
    } else {
      node.pause();
    }
  }, [mediaUrl, playing]);

  if (!visible || !primaryVideo) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[22] flex items-center justify-center",
        "pb-[min(38vh,320px)] pt-[max(3rem,env(safe-area-inset-top))]",
        className,
      )}
      data-globe-context-map-video
      aria-hidden={!mediaUrl}
    >
      <div
        className={cn(
          "relative w-[min(42vw,168px)] overflow-hidden rounded-[1.25rem]",
          "border-2 border-white/90 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.28)]",
          "ring-1 ring-black/10",
        )}
      >
        {mediaUrl ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="aspect-[9/16] w-full object-cover"
            playsInline
            muted
            loop
            autoPlay
          />
        ) : (
          <div className="flex aspect-[9/16] w-full items-center justify-center bg-black/80 px-3 text-center text-[12px] font-medium text-white/70">
            {loading ? "동영상 불러오는 중…" : primaryVideo.label}
          </div>
        )}
        {mediaUrl ? (
          <button
            type="button"
            className="pointer-events-auto absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? "일시정지" : "재생"}
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            className="pointer-events-auto absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
            onClick={onDismiss}
          >
            닫기
          </button>
        ) : null}
      </div>
    </div>
  );
}
