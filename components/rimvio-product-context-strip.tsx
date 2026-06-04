"use client";

import Link from "next/link";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type RimvioProductContextStripProps = {
  variant: "feed" | "peers";
  className?: string;
  /** peers 빈 허브 — 실행 탭 링크 */
  showFeedLink?: boolean;
};

export function RimvioProductContextStrip({
  variant,
  className,
  showFeedLink = false,
}: RimvioProductContextStripProps) {
  const copy = useCopy();
  const line =
    variant === "feed" ? copy.product.feedContext : copy.product.peersContext;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-center",
        className,
      )}
    >
      <p className="text-[12px] font-medium leading-snug text-white/75">{line}</p>
      <p className="mt-0.5 text-[10px] text-white/40">{copy.product.oneLinerSub}</p>
      {showFeedLink ? (
        <Link
          href="/feed"
          className="mt-1.5 inline-block text-[11px] font-medium text-rimvio-neon-cyan"
        >
          {copy.peers.emptyFeedLink} →
        </Link>
      ) : null}
    </div>
  );
}
