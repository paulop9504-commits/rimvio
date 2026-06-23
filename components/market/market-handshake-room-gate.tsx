"use client";

import { Package } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { rimvioCompactPrimaryCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";
import type { MarketHandshakeRoomState } from "@/lib/globe/market/client/sync-market-intent-remote";
import { MarketExperienceTagPills } from "@/components/market/market-memory-record-fields";

export type MarketHandshakeProductStripProps = {
  handshake: MarketHandshakeRoomState;
  className?: string;
};

export function MarketHandshakeProductStrip({
  handshake,
  className,
}: MarketHandshakeProductStripProps) {
  const { product } = handshake;
  return (
    <div
      className={cn(
        "border-b border-black/[0.06] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md",
        className,
      )}
      data-market-handshake-product
    >
      <div className="flex gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          <Package className="size-6 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(RIMVIO_TYPE.body, "truncate font-semibold")}>{product.title}</p>
          <p className={cn(RIMVIO_TYPE.caption, "mt-0.5")}>
            {product.priceLine} · {product.category}
          </p>
          {product.placeLabel ? (
            <p className={cn(RIMVIO_TYPE.caption, "mt-0.5 text-muted-foreground")}>
              {product.placeLabel}
            </p>
          ) : null}
          {handshake.priorityHint ? (
            <p className={cn(RIMVIO_TYPE.caption, "mt-1 text-primary/90")}>
              {handshake.priorityHint}
            </p>
          ) : null}
          {handshake.viewerRole === "seeking" && handshake.product.memoryPreview ? (
            <p className={cn(RIMVIO_TYPE.caption, "mt-1.5 leading-snug text-foreground/90")}>
              {handshake.product.memoryPreview}
            </p>
          ) : null}
          {handshake.viewerRole === "listing" && handshake.product.matchMemoryPreview ? (
            <p className={cn(RIMVIO_TYPE.caption, "mt-1.5 leading-snug text-foreground/90")}>
              {copy.globe.marketMemoryMatchSeekingPreview(handshake.product.matchMemoryPreview)}
            </p>
          ) : null}
          <MarketExperienceTagPills
            tags={
              handshake.viewerRole === "listing"
                ? handshake.product.matchExperienceTags
                : handshake.product.experienceTags
            }
          />
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
