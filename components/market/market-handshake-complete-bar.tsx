"use client";

import { copy } from "@/lib/copy/human-ko";
import { rimvioCompactPrimaryCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import type { MarketHandshakeRoomState } from "@/lib/globe/market/client/sync-market-intent-remote";
import { cn } from "@/lib/utils";

export type MarketHandshakeCompleteBarProps = {
  handshake: MarketHandshakeRoomState;
  busy?: boolean;
  onConfirm: () => void;
  className?: string;
};

export function MarketHandshakeCompleteBar({
  handshake,
  busy = false,
  onConfirm,
  className,
}: MarketHandshakeCompleteBarProps) {
  const label =
    handshake.viewerRole === "listing"
      ? copy.globe.marketHandshakeCompleteListingCta
      : copy.globe.marketHandshakeCompleteSeekingCta;

  return (
    <div className={cn("border-t border-black/[0.06] bg-white/95 px-4 py-3", className)}>
      {handshake.awaitingOtherParty ? (
        <p className={cn(RIMVIO_TYPE.caption, "text-center text-muted-foreground")}>
          {copy.globe.marketHandshakeAwaitingOtherParty}
        </p>
      ) : (
        <button
          type="button"
          className={cn(rimvioCompactPrimaryCtaClass(), "w-full")}
          disabled={busy || !handshake.canConfirmComplete}
          onClick={onConfirm}
        >
          {label}
        </button>
      )}
    </div>
  );
}
