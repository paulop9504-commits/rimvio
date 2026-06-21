"use client";

import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { cn } from "@/lib/utils";
import type { BridgeCompanionStatus } from "@/lib/experience-bridge/project-bridge-companion-status";

export type BridgeCompanionParticipant = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  status?: "pending" | "accepted" | "declined" | "left" | "removed";
};

type BridgeCompanionStatusStripProps = {
  status: BridgeCompanionStatus;
  participants?: readonly BridgeCompanionParticipant[];
  viewerUserId?: string | null;
  compact?: boolean;
  className?: string;
};

const TONE_CLASS: Record<BridgeCompanionStatus["tone"], string> = {
  idle: "bg-muted/60 text-muted-foreground",
  syncing: "bg-[#0071e3]/10 text-[#0071e3]",
  uploading: "bg-[#0071e3]/10 text-[#0071e3]",
  pending: "bg-amber-500/10 text-amber-950 dark:text-amber-100",
  ready: "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
};

export function BridgeCompanionStatusStrip({
  status,
  participants = [],
  viewerUserId,
  compact = false,
  className,
}: BridgeCompanionStatusStripProps) {
  const others = participants.filter(
    (row) => row.userId.trim() && row.userId !== viewerUserId?.trim(),
  );
  const pulsing =
    status.tone === "syncing" ||
    status.tone === "uploading" ||
    status.tone === "pending";

  return (
    <div
      className={cn(
        "text-[12px] leading-snug",
        compact ? "rounded-full px-3 py-2" : "rounded-2xl px-3 py-2.5",
        TONE_CLASS[status.tone],
        className,
      )}
      role="status"
      data-bridge-companion-status={status.tone}
    >
      <div className="flex items-center gap-2">
        {others.length > 0 ? (
          <div className="flex shrink-0 -space-x-1.5">
            {others.slice(0, 2).map((row) => (
              <PeerProfileAvatar
                key={row.userId}
                displayName={row.displayName}
                avatarUrl={row.avatarUrl}
                size="sm"
                className={cn(
                  "size-6 ring-2 ring-background",
                  pulsing && "animate-pulse",
                )}
              />
            ))}
          </div>
        ) : null}
        <p className="min-w-0 flex-1 truncate font-semibold">{status.line}</p>
      </div>
    </div>
  );
}
