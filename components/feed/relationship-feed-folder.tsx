"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { RelationshipFeedSlotSheet } from "@/components/feed/relationship-feed-slot-sheet";
import { useRelationshipFeedSlots } from "@/hooks/use-relationship-feed-slots";
import { cn } from "@/lib/utils";

type RelationshipFeedFolderProps = {
  className?: string;
};

/** Feed header: DM folder beside resource pool (Kakao-style slot list). */
export function RelationshipFeedFolder({ className }: RelationshipFeedFolderProps) {
  const [open, setOpen] = useState(false);
  const { slots, unreadTotal, refresh, useRemote } = useRelationshipFeedSlots(true);

  if (!useRemote) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={`대화 ${slots.length}개`}
        onClick={() => {
          void refresh();
          setOpen(true);
        }}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full bg-transparent text-white transition-opacity hover:opacity-80 active:scale-95",
          className,
        )}
      >
        <MessageCircle className="size-5" strokeWidth={2.1} />
        {unreadTotal > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-400 px-0.5 text-[10px] font-extrabold tabular-nums leading-none text-slate-900 shadow-[0_0_8px_rgba(251,191,36,0.45)]">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        ) : null}
      </button>

      <RelationshipFeedSlotSheet
        open={open}
        onOpenChange={setOpen}
        slots={slots}
        onRefresh={() => void refresh()}
      />
    </>
  );
}
