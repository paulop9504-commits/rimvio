"use client";

import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { cn } from "@/lib/utils";

export type BridgeParticipantRow = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: "host" | "participant";
  status?: string;
};

function participantsFromReel(
  items: readonly ContextMediaReelItem[],
): BridgeParticipantRow[] {
  const byId = new Map<string, BridgeParticipantRow>();
  for (const item of items) {
    const userId = item.ownerUserId?.trim() || item.authorDisplayName?.trim();
    if (!userId) {
      continue;
    }
    if (byId.has(userId)) {
      continue;
    }
    byId.set(userId, {
      userId,
      displayName: item.authorDisplayName?.trim() || "친구",
      avatarUrl: item.authorAvatarUrl ?? null,
    });
  }
  return [...byId.values()];
}

export type ExperienceBridgeParticipantsStripProps = {
  items: readonly ContextMediaReelItem[];
  participants?: readonly BridgeParticipantRow[];
  className?: string;
};

/** Face pile — who is in this shared experience. */
export function ExperienceBridgeParticipantsStrip({
  items,
  participants = [],
  className,
}: ExperienceBridgeParticipantsStripProps) {
  const fromReel = participantsFromReel(items);
  const merged = participants.length > 0 ? participants : fromReel;
  const visible = merged.slice(0, 5);
  const overflow = merged.length - visible.length;

  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-experience-bridge-participants
    >
      <div className="flex -space-x-2">
        {visible.map((row) => (
          <PeerProfileAvatar
            key={row.userId}
            displayName={row.displayName}
            avatarUrl={row.avatarUrl}
            size="sm"
            className="size-8 ring-2 ring-background"
          />
        ))}
        {overflow > 0 ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-background">
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
}
