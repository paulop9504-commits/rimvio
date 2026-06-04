"use client";

import Link from "next/link";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type RimvioProductContextStripProps = {
  variant: "feed" | "peers";
  className?: string;
  /** peers 빈 허브 — 실행 탭 링크 */
  showFeedLink?: boolean;
  /** feed 헤더 — 로고·아이콘 아래 한 줄 (겹침 방지) */
  layout?: "card" | "header";
};

export function RimvioProductContextStrip({
  variant,
  className,
  showFeedLink = false,
  layout = "card",
}: RimvioProductContextStripProps) {
  const copy = useCopy();
  const line =
    variant === "feed" ? copy.product.feedContext : copy.product.peersContext;

  if (layout === "header") {
    return (
      <div className={cn("min-w-0 pr-1", className)}>
        <p className="truncate text-[11px] font-medium leading-snug text-white/72">
          {line}
        </p>
        <p className="mt-0.5 hidden text-[10px] leading-snug text-white/38 min-[360px]:line-clamp-1 min-[360px]:block">
          {copy.product.oneLinerSub}
        </p>
      </div>
    );
  }

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
