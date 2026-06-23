"use client";

import { useState } from "react";
import { MapPin, Package } from "lucide-react";
import { MarketExperienceTagPills } from "@/components/market/market-memory-record-fields";
import { useMarketHandshakeProductPhotos } from "@/hooks/use-market-handshake-product-photos";
import { copy } from "@/lib/copy/human-ko";
import { rimvioCompactPrimaryCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import type { MarketHandshakeRoomState } from "@/lib/globe/market/client/sync-market-intent-remote";
import { cn } from "@/lib/utils";

export type MarketHandshakeProductStripProps = {
  handshake: MarketHandshakeRoomState;
  className?: string;
};

function PhotoTile({
  url,
  active,
  onSelect,
}: {
  url: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted/40",
        active ? "border-primary ring-2 ring-primary/20" : "border-white/40",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-full object-cover" loading="lazy" />
    </button>
  );
}

export function MarketHandshakeProductStrip({
  handshake,
  className,
}: MarketHandshakeProductStripProps) {
  const { product } = handshake;
  const { heroUrl, galleryUrls } = useMarketHandshakeProductPhotos(handshake);
  const [activeIndex, setActiveIndex] = useState(0);
  const hero = galleryUrls[activeIndex] ?? heroUrl;

  const memoryLine =
    handshake.viewerRole === "seeking"
      ? product.memoryPreview
      : product.matchMemoryPreview
        ? copy.globe.marketMemoryMatchSeekingPreview(product.matchMemoryPreview)
        : null;

  const tags =
    handshake.viewerRole === "listing"
      ? product.matchExperienceTags
      : product.experienceTags;

  return (
    <div
      className={cn(
        "border-b border-black/[0.06] bg-gradient-to-b from-primary/[0.06] to-background px-4 pb-4 pt-3 shadow-sm",
        className,
      )}
      data-market-handshake-product
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-[#2b7fff] px-2.5 py-0.5 text-[10px] font-bold text-white">
          {copy.globe.marketPinRoleListing}
        </span>
        <span className={cn(RIMVIO_TYPE.caption)}>{product.category}</span>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05]">
        <div className="relative aspect-[16/10] w-full bg-muted/50">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <Package className="size-8 text-primary/50" aria-hidden />
              <span className={cn(RIMVIO_TYPE.caption)}>
                {product.photoCount > 0
                  ? copy.globe.marketHandshakePhotoLoading(product.photoCount)
                  : copy.globe.marketHandshakeNoPhoto}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-8">
            <p className="truncate text-[17px] font-bold text-white">{product.title}</p>
            <p className="mt-0.5 text-[15px] font-semibold text-white/95">{product.priceLine}</p>
          </div>
        </div>

        {galleryUrls.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {galleryUrls.map((url, index) => (
              <PhotoTile
                key={`${url}-${index}`}
                url={url}
                active={index === activeIndex}
                onSelect={() => setActiveIndex(index)}
              />
            ))}
          </div>
        ) : null}

        <div className="space-y-2 px-3 pb-3 pt-1">
          {product.placeLabel ? (
            <p className="flex items-center gap-1.5 text-[13px] text-foreground/90">
              <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{product.placeLabel}</span>
            </p>
          ) : null}
          {product.memoryPlaceLabel ? (
            <p className={cn(RIMVIO_TYPE.caption, "rounded-xl bg-primary/5 px-2.5 py-2")}>
              {copy.globe.marketHandshakeMemoryPlace(product.memoryPlaceLabel)}
            </p>
          ) : null}
          {memoryLine ? (
            <p className={cn(RIMVIO_TYPE.caption, "leading-snug text-foreground/85")}>{memoryLine}</p>
          ) : null}
          {handshake.priorityHint ? (
            <p className={cn(RIMVIO_TYPE.caption, "text-primary/90")}>{handshake.priorityHint}</p>
          ) : null}
          <MarketExperienceTagPills tags={tags} />
        </div>
      </div>
    </div>
  );
}

export type MarketHandshakeStartBarProps = {
  busy?: boolean;
  onStart: () => void;
  className?: string;
};

export function MarketHandshakeStartBar({
  busy = false,
  onStart,
  className,
}: MarketHandshakeStartBarProps) {
  return (
    <div className={cn("border-t border-black/[0.06] bg-white/95 px-4 py-3", className)}>
      <button
        type="button"
        className={cn(rimvioCompactPrimaryCtaClass(), "w-full")}
        disabled={busy}
        onClick={onStart}
      >
        {copy.globe.marketHandshakeStartCta}
      </button>
    </div>
  );
}

export function MarketHandshakeLockedHint({ className }: { className?: string }) {
  return (
    <p className={cn(RIMVIO_TYPE.caption, "px-4 py-2 text-center text-muted-foreground", className)}>
      {copy.globe.marketHandshakeChatLocked}
    </p>
  );
}
