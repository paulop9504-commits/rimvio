"use client";

import { Shimmer } from "@/components/ui/shimmer";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeContextTriggerMediaPreview } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { cn } from "@/lib/utils";

function usePreviewSrc(media?: GlobeContextTriggerMediaPreview) {
  const { url: blobUrl, loading } = useMediaBlobUrl(
    media?.allowLocalBlob ? media.mediaContextId : null,
  );
  return {
    src: media?.imageUrl ?? blobUrl ?? null,
    loading: Boolean(media) && loading && !media?.imageUrl,
  };
}

function pickHeroPreview(
  previews: readonly GlobeContextTriggerMediaPreview[],
): GlobeContextTriggerMediaPreview | null {
  if (previews.length === 0) {
    return null;
  }
  const video = previews.find((row) => row.kind === "video");
  if (video) {
    return video;
  }
  const remote = previews.find((row) => row.imageUrl?.trim());
  return remote ?? previews[0] ?? null;
}

function RecallBackdrop({
  hero,
  emoji,
}: {
  hero: GlobeContextTriggerMediaPreview | null;
  emoji: string;
}) {
  const { src, loading } = usePreviewSrc(hero ?? undefined);

  if (hero && loading && !src) {
    return <Shimmer className="absolute inset-0" aria-hidden />;
  }

  if (src) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full scale-[1.03] object-cover"
          loading="lazy"
          decoding="async"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-amber-900/18 via-transparent to-orange-950/22 mix-blend-soft-light"
          aria-hidden
        />
      </>
    );
  }

  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-[#dfe7f2] via-[#f3ebe3] to-[#e8dfd4]"
      aria-hidden
    >
      <span className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-[3.5rem] opacity-35">
        {emoji}
      </span>
    </div>
  );
}

function RecallPolaroidStack({
  items,
}: {
  items: readonly GlobeContextTriggerMediaPreview[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="absolute right-2.5 top-2.5 z-20 flex items-end gap-1.5" aria-hidden>
      {items.map((item, index) => (
        <RecallPolaroid key={item.id} media={item} tilt={index === 0 ? -7 : 5} />
      ))}
    </div>
  );
}

function RecallPolaroid({
  media,
  tilt,
}: {
  media: GlobeContextTriggerMediaPreview;
  tilt: number;
}) {
  const { src, loading } = usePreviewSrc(media);

  return (
    <span
      className="block size-11 overflow-hidden rounded-[10px] bg-white p-0.5 shadow-[0_6px_18px_rgba(15,23,42,0.22)] ring-1 ring-white/80"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {loading && !src ? (
        <Shimmer className="size-full rounded-[8px]" />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full rounded-[8px] object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center rounded-[8px] bg-[#eef1f4] text-[10px] text-[#8b95a1]">
          ·
        </span>
      )}
    </span>
  );
}

export type GlobeContextTriggerRecallCardProps = {
  trigger: GlobeContextTrigger;
  active?: boolean;
  compact?: boolean;
  onPress: () => void;
  className?: string;
};

/** Memory poster card — user's photos as the hook, text on warm scrim. */
export function GlobeContextTriggerRecallCard({
  trigger,
  active = false,
  compact = false,
  onPress,
  className,
}: GlobeContextTriggerRecallCardProps) {
  const previews = trigger.mediaPreviews?.filter(Boolean) ?? [];
  const hero = pickHeroPreview(previews);
  const stack = previews.filter((row) => row.id !== hero?.id).slice(0, 2);
  const hasMedia = Boolean(hero);
  const isVideo = hero?.kind === "video";

  return (
    <button
      type="button"
      onClick={onPress}
      data-trigger-carousel-card
      data-trigger-carousel-active={active ? "true" : "false"}
      data-globe-context-trigger-recall-card
      className={cn(
        "group relative shrink-0 snap-center overflow-hidden rounded-[18px] text-left shadow-[0_6px_20px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.06] transition-all duration-300 active:scale-[0.98]",
        compact
          ? active
            ? "h-[8.25rem] w-[9.25rem] scale-100 opacity-100 shadow-[0_10px_28px_rgba(255,107,74,0.2)] ring-[#ff6b4a]/35"
            : "h-[7.5rem] w-[8.25rem] scale-[0.96] opacity-[0.88]"
          : active
            ? "h-[16.5rem] w-[13rem] scale-100 opacity-100 shadow-[0_14px_44px_rgba(255,107,74,0.24)] ring-[#ff6b4a]/35"
            : "h-[15rem] w-[11.75rem] scale-[0.96] opacity-[0.88]",
        className,
      )}
    >
      <RecallBackdrop hero={hero} emoji={trigger.emoji} />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(15,23,42,0.28)_100%)]"
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          hasMedia
            ? "bg-gradient-to-t from-black/88 via-black/42 to-black/10"
            : "bg-gradient-to-t from-[#191f28]/78 via-[#191f28]/28 to-transparent",
        )}
        aria-hidden
      />

      {stack.length > 0 ? <RecallPolaroidStack items={stack} /> : null}

      {isVideo ? (
        <span className="absolute left-2.5 top-2.5 z-20 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white/92 backdrop-blur-sm">
          영상
        </span>
      ) : null}

      <div className={cn("absolute inset-x-0 bottom-0 z-20", compact ? "px-2.5 pb-2 pt-6" : "px-3.5 pb-3.5 pt-10")}>
        <p
          className={cn(
            "line-clamp-2 font-bold leading-snug tracking-tight drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]",
            compact ? "text-[13px]" : "text-[15px]",
            hasMedia ? "text-white" : "text-white",
          )}
        >
          {trigger.title}
        </p>
        <p
          className={cn(
            "mt-0.5 line-clamp-2 leading-relaxed",
            compact ? "text-[10px]" : "text-[12px]",
            hasMedia ? "text-white/78" : "text-white/72",
          )}
        >
          {trigger.body}
        </p>
        {!compact ? (
          <p className="mt-2 text-[11px] font-medium text-white/52 transition-colors group-hover:text-white/72">
            {copy.globe.contextTriggerOpenHint}
          </p>
        ) : null}
      </div>
    </button>
  );
}
