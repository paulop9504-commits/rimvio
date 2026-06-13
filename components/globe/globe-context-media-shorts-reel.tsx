"use client";

import { useEffect, useRef, useState } from "react";
import { ContextMediaUploaderBadge } from "@/components/globe/context-media-uploader-badge";
import { ContextMediaDeleteButton } from "@/components/globe/context-media-delete-button";
import { ContextMediaVideoSoundButton } from "@/components/globe/context-media-video-sound-button";
import { useGlobeContextVideoSound } from "@/hooks/use-globe-context-video-sound";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/ui/shimmer";

function ContextMediaShortsSlide({
  item,
  eyebrow,
  index,
  total,
  fillViewport,
  embedded,
  selfDisplayName,
  selfAvatarUrl,
  eventId,
  viewerUserId,
  deletable,
  onMediaDeleted,
}: {
  item: ContextMediaReelItem;
  eyebrow: string;
  index: number;
  total: number;
  fillViewport?: boolean;
  /** Pin sheet — media lives in its own scroll pane (no overlap with info). */
  embedded?: boolean;
  selfDisplayName?: string | null;
  selfAvatarUrl?: string | null;
  eventId?: string | null;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(true);
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
    visible,
    soundByDefault: embedded,
    onPlayFailed: () => setPlaying(false),
  });

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.6));
      },
      { threshold: [0, 0.6, 0.9] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={rootRef}
      className={cn(
        "relative isolate flex shrink-0 snap-start snap-always flex-col px-3",
        fillViewport && embedded && "min-h-full items-center justify-center py-3",
        fillViewport && !embedded && "min-h-full justify-start pb-4 pt-2",
        !fillViewport && "min-h-[min(78vh,680px)] justify-center py-2",
      )}
      data-globe-context-shorts-slide
      data-media-kind={item.kind}
    >
      <div
        className={cn(
          "mx-auto flex items-center gap-2",
          fillViewport && embedded ? "max-h-full" : "max-w-[min(100%,340px)]",
        )}
      >
        {isVideo && src ? (
          <ContextMediaVideoSoundButton
            soundOn={soundOn}
            onToggleSound={() => {
              toggleSound();
              if (!playing) {
                setPlaying(true);
              }
            }}
          />
        ) : null}
        <div
          className={cn(
            "relative min-w-0 overflow-hidden rounded-[1.25rem] bg-black shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-black/10",
            fillViewport && embedded
              ? "aspect-[9/16] max-h-full w-auto max-w-[min(100%,340px)]"
              : "aspect-[9/16] w-full flex-1",
          )}
        >
        {isVideo && src ? (
          <button
            type="button"
            className="absolute inset-0 z-[1]"
            aria-label={playing ? "일시정지" : "재생"}
            onClick={() => {
              setPlaying((value) => !value);
            }}
          />
        ) : null}
        {src && isVideo ? (
          <video
            key={`${item.id}:${src}`}
            ref={videoRef}
            src={src}
            className="relative z-0 size-full object-cover"
            playsInline
            loop
            preload="metadata"
          />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${item.id}:${src}`}
            src={src}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : item.pendingRemote ? (
          <div className="flex size-full flex-col items-center justify-center gap-3 px-4">
            <Shimmer className="size-14 rounded-full" />
            <p className="text-center text-[13px] font-medium text-white/70">
              공유 {isVideo ? "동영상" : "사진"} 불러오는 중…
            </p>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center text-[13px] font-medium text-white/70">
            {loading ? "불러오는 중…" : item.label}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-4 pt-20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
            {eyebrow}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-white">
            {item.recallCaption}
          </p>
        </div>

        <ContextMediaUploaderBadge
          item={item}
          selfDisplayName={selfDisplayName}
          selfAvatarUrl={selfAvatarUrl}
          className="right-3 top-3"
        />

        <span className="pointer-events-none absolute right-3 top-12 z-[2] rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/90">
          {index + 1}/{total}
        </span>

        {isVideo && src ? (
          <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/90">
            {visible && playing ? "일시정지" : "재생"}
          </span>
        ) : null}

        {eventId && deletable ? (
          <ContextMediaDeleteButton
            item={item}
            eventId={eventId}
            viewerUserId={viewerUserId}
            enabled={deletable}
            onDeleted={onMediaDeleted}
          />
        ) : null}
        </div>
      </div>
    </section>
  );
}

export type GlobeContextMediaShortsReelProps = {
  items: readonly ContextMediaReelItem[];
  title: string;
  place: string;
  /** Each slide fills the scroll viewport — Instagram / Shorts snap. */
  fillViewport?: boolean;
  /** Pin sheet — reel omits wrapper height; slides snap inside parent pane only. */
  embedded?: boolean;
  className?: string;
  eventId?: string | null;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
};

/** Vertical Shorts reel — all photos & videos in one context. */
export function GlobeContextMediaShortsReel({
  items,
  title,
  place,
  fillViewport = false,
  embedded = false,
  className,
  eventId,
  viewerUserId,
  deletable = false,
  onMediaDeleted,
}: GlobeContextMediaShortsReelProps) {
  const [selfDisplayName, setSelfDisplayName] = useState<string | null>(null);
  const [selfAvatarUrl, setSelfAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyAccountProfile()
      .then((profile) => {
        setSelfDisplayName(
          profile?.displayName?.trim() ||
            profile?.rimvioId?.trim() ||
            "나",
        );
        setSelfAvatarUrl(profile?.avatarUrl?.trim() || null);
      })
      .catch(() => {
        setSelfDisplayName("나");
      });
  }, []);

  if (items.length === 0) {
    return null;
  }

  const eyebrow = [title, place].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        fillViewport && embedded && "contents",
        fillViewport && !embedded && "min-h-0",
        !fillViewport && "space-y-1",
        className,
      )}
      data-globe-context-shorts-reel
      data-globe-context-shorts-count={items.length}
      data-globe-context-shorts-embedded={embedded ? "true" : undefined}
    >
      {items.map((item, index) => (
        <ContextMediaShortsSlide
          key={item.id}
          item={item}
          eyebrow={eyebrow}
          index={index}
          total={items.length}
          fillViewport={fillViewport}
          embedded={embedded}
          selfDisplayName={selfDisplayName}
          selfAvatarUrl={selfAvatarUrl}
          eventId={eventId}
          viewerUserId={viewerUserId}
          deletable={deletable}
          onMediaDeleted={onMediaDeleted}
        />
      ))}
      {!fillViewport ? (
        <p className="px-3 pb-1 text-center text-[11px] text-muted-foreground">
          {items.length}개 · 아래로 스와이프
        </p>
      ) : null}
    </div>
  );
}
