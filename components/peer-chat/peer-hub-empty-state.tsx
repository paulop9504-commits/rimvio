"use client";

import Link from "next/link";
import { MessageCircle, UserPlus } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type PeerHubEmptyStateProps = {
  className?: string;
  onAddFriend: () => void;
};

export function PeerHubEmptyState({
  className,
  onAddFriend,
}: PeerHubEmptyStateProps) {
  const copy = useCopy();

  return (
    <div
      className={cn(
        "flex min-h-[min(72vh,32rem)] flex-col items-center justify-center px-8 py-16 text-center",
        className,
      )}
      aria-label={copy.peers.emptyTitle}
    >
      <span className="mb-5 flex size-[4.5rem] items-center justify-center rounded-[1.75rem] bg-[#f2f4f6] text-[#3182f6] shadow-sm ring-1 ring-[#02204708]">
        <MessageCircle className="size-9 stroke-[1.5]" aria-hidden />
      </span>
      <h2 className="text-[18px] font-semibold tracking-tight text-[#191f28]">
        {copy.peers.emptyTitle}
      </h2>
      <p className="mt-2 max-w-[17rem] text-[14px] leading-relaxed text-[#6b7684]">
        {copy.peers.emptyBody}
      </p>
      <button
        type="button"
        onClick={onAddFriend}
        className="rimvio-accent-submit-btn mt-7 flex min-w-[12.5rem] items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm active:scale-[0.98]"
      >
        <UserPlus className="size-[18px]" aria-hidden />
        {copy.peers.emptyAddCta}
      </button>
      <Link
        href="/"
        className="mt-4 py-2 text-[13px] font-medium text-[#3182f6] active:opacity-70"
      >
        {copy.peers.emptyGlobeLink}
      </Link>
    </div>
  );
}
