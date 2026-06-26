"use client";

import { Package } from "lucide-react";
import { useMarketHandshakeProductPhotos } from "@/hooks/use-market-handshake-product-photos";
import { rimvioCompactPrimaryCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { copy } from "@/lib/copy/human-ko";
import type { MarketHandshakeRoomState } from "@/lib/globe/market/client/sync-market-intent-remote";
import { cn } from "@/lib/utils";

export type MarketHandshakeProductStripProps = {
  handshake: MarketHandshakeRoomState;
  className?: string;
};

/** 맞춤톡 — 한 줄 맥락만 (상세·일정은 Field 대시보드). */
export function MarketHandshakeProductStrip({
  handshake,
  className,
}: MarketHandshakeProductStripProps) {
  const { product } = handshake;
  const { heroUrl, heroVideoUrl } = useMarketHandshakeProductPhotos(handshake);
  const metaParts = [product.priceLine, product.placeLabel].filter(Boolean);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 border-b border-black/[0.06] bg-muted/20 px-4 py-2",
        className,
      )}
      data-market-handshake-product
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted/60 ring-1 ring-black/[0.05]">
        {heroVideoUrl ? (
          <video
            src={heroVideoUrl}
            muted
            playsInline
            autoPlay
            loop
            preload="metadata"
            className="size-full object-cover"
          />
        ) : heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Package className="size-4 text-primary/50" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">{product.title}</p>
        {handshake.buyerEnRouteLabel ? (
          <p className="truncate text-[13px] font-medium text-[#2563eb]">
            {handshake.buyerEnRouteLabel}
          </p>
        ) : metaParts.length > 0 ? (
          <p className={cn(RIMVIO_TYPE.caption, "truncate")}>{metaParts.join(" · ")}</p>
        ) : null}
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
