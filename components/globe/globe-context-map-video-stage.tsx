"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
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
  anchorLat?: number | null;
  anchorLng?: number | null;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  visible?: boolean;
  onDismiss?: () => void;
  onOpenDetails?: () => void;
  className?: string;
};

/** Pin-anchored context video — scales down when the globe zooms out. */
export function GlobeContextMapVideoStage({
  eventId,
  anchorLat,
  anchorLng,
  globeRef,
  visible = true,
  onDismiss,
  onOpenDetails,
  className,
}: GlobeContextMapVideoStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const anchorLayout = useGlobePinScreenAnchor({
    globeRef: globeRef ?? { current: null },
    lat: anchorLat,
    lng: anchorLng,
    enabled: visible && Boolean(primaryVideo) && Boolean(globeRef),
    containerRef,
  });

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
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[22] overflow-hidden",
        className,
      )}
      data-globe-context-map-video
      aria-hidden={!mediaUrl || !anchorLayout}
    >
      {anchorLayout ? (
        <div
          className="absolute z-[1]"
          style={{
            left: anchorLayout.x,
            top: anchorLayout.y,
            width: anchorLayout.widthPx,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
          data-globe-context-map-video-anchor
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-[1.25rem]",
              "border-2 border-white/90 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.28)]",
              "ring-1 ring-black/10",
            )}
          >
            {onOpenDetails ? (
              <button
                type="button"
                className="pointer-events-auto absolute inset-0 z-[1]"
                aria-label="맥락 자세히 보기"
                onClick={onOpenDetails}
              />
            ) : null}
            {mediaUrl ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                className="relative z-0 aspect-[9/16] w-full object-cover"
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
            {mediaUrl && anchorLayout.scale >= 0.34 ? (
              <button
                type="button"
                className="pointer-events-auto absolute bottom-2 right-2 z-[2] rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  setPlaying((value) => !value);
                }}
              >
                {playing ? "일시정지" : "재생"}
              </button>
            ) : null}
            {onDismiss && anchorLayout.scale >= 0.34 ? (
              <button
                type="button"
                className="pointer-events-auto absolute left-2 top-2 z-[2] rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismiss();
                }}
              >
                닫기
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
