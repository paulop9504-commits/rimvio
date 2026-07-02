"use client";

import Link from "next/link";
import { MessageCircle, UserPlus } from "lucide-react";
import { DemoPeerRoomPreview } from "@/components/peer-chat/demo-peer-room-preview";
import { RimvioStarterExampleChips } from "@/components/rimvio-starter-example-chips";
import { useCopy } from "@/hooks/use-copy";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
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
      className={cn("flex flex-col px-4 pb-8 pt-6", className)}
      aria-label={copy.peers.emptyTitle}
    >
      <div className="flex flex-col items-center px-4 py-8 text-center">
        <span className="mb-5 flex size-[4.5rem] items-center justify-center rounded-[1.75rem] bg-muted text-primary shadow-sm ring-1 ring-primary/10">
          <MessageCircle className="size-9 stroke-[1.5]" aria-hidden />
        </span>
        <h2 className={cn("text-[18px] tracking-tight", RIMVIO_TYPE.headline)}>
          {copy.peers.emptyTitle}
        </h2>
        <p className={cn("mt-2 max-w-[18rem] text-[14px] leading-relaxed", RIMVIO_TYPE.caption)}>
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
          className="mt-4 py-2 text-[13px] font-medium text-primary active:opacity-70"
        >
          {copy.peers.emptyGlobeLink}
        </Link>
      </div>

      <DemoPeerRoomPreview className="mx-0" />

      <RimvioStarterExampleChips className="mt-5 px-1" />
    </div>
  );
}
