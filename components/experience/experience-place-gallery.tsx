"use client";

import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { PlaceGalleryItem } from "@/lib/globe/project-place-gallery";
import { cn } from "@/lib/utils";

function GalleryThumb({
  item,
  active,
  onSelect,
}: {
  item: PlaceGalleryItem;
  active: boolean;
  onSelect: () => void;
}) {
  const { url: blobUrl } = useMediaBlobUrl(item.mediaContextId);
  const src = item.imageUrl ?? blobUrl;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative h-24 w-[4.75rem] shrink-0 overflow-hidden rounded-xl border bg-muted transition-all",
        active
          ? "border-primary/50 ring-2 ring-primary/25"
          : "border-border/80 opacity-90 hover:opacity-100",
      )}
      aria-label={item.label}
      aria-pressed={active}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full items-center justify-center px-1 text-center text-[9px] text-muted-foreground">
          {item.label}
        </div>
      )}
    </button>
  );
}

export type ExperiencePlaceGalleryProps = {
  items: readonly PlaceGalleryItem[];
  activeId?: string | null;
  onActiveIdChange?: (id: string) => void;
  className?: string;
};

/** Google Maps–style horizontal place photo strip. */
export function ExperiencePlaceGallery({
  items,
  activeId,
  onActiveIdChange,
  className,
}: ExperiencePlaceGalleryProps) {
  if (items.length === 0) {
    return null;
  }

  const active =
    items.find((row) => row.id === activeId) ?? items[0]!;

  const { url: heroBlob } = useMediaBlobUrl(active.mediaContextId);
  const heroSrc = active.imageUrl ?? heroBlob;

  return (
    <section className={cn("space-y-3", className)} data-experience-place-gallery>
      <div className="relative aspect-[4/5] max-h-[min(52vh,420px)] w-full overflow-hidden rounded-2xl bg-muted">
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroSrc}
            alt=""
            className="size-full object-cover"
            data-place-gallery-hero
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[13px] text-muted-foreground">
            {active.label}
          </div>
        )}
      </div>
      {items.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <GalleryThumb
              key={item.id}
              item={item}
              active={item.id === active.id}
              onSelect={() => onActiveIdChange?.(item.id)}
            />
          ))}
        </div>
      ) : null}
      <p className="text-[12px] text-muted-foreground">이미지 {items.length}개</p>
    </section>
  );
}
