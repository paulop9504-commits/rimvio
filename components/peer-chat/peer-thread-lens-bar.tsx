"use client";

import { Pin, Sparkles } from "lucide-react";
import { UNPIN_PEER_RETENTION_DAYS } from "@/lib/context/hub-room-retention";
import { PINNED_PEER_SLOTS } from "@/lib/context/peer-thread-types";
import { countConnectedPeers } from "@/lib/context/pinned-peer-roster";
import type { PinnedPeerRoster } from "@/lib/context/peer-thread-types";
import { cn } from "@/lib/utils";

type PeerThreadLensBarProps = {
  displayName: string;
  aiLensEnabled: boolean;
  isPinned: boolean;
  roster: PinnedPeerRoster;
  onAiLensChange: (enabled: boolean) => void;
  onPinnedChange: (pinned: boolean) => void;
  className?: string;
};

/**
 * 친구 ROOM + 고정(?�결) ?�태?�서�??�즈·고정?�.
 * AI ?�행 �?본인)?�는 ??바�? ?��? ?�음.
 */
export function PeerThreadLensBar({
  displayName,
  aiLensEnabled,
  isPinned,
  roster,
  onAiLensChange,
  onPinnedChange,
  className,
}: PeerThreadLensBarProps) {
  const connectedCount = countConnectedPeers(roster);
  const rosterFull = connectedCount >= PINNED_PEER_SLOTS && !isPinned;

  if (!isPinned) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-rimvio-surface/95 px-3 py-2",
        className
      )}
      role="toolbar"
      aria-label={`${displayName} ROOM ?�정`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={aiLensEnabled}
        aria-label="AI ?�즈"
        onClick={() => onAiLensChange(!aiLensEnabled)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
          aiLensEnabled
            ? "bg-indigo-500 text-white shadow-sm"
            : "bg-[#F3F4F6] text-muted-foreground"
        )}
      >
        <Sparkles className="size-3.5" aria-hidden />
        AI ?�즈
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={isPinned}
        aria-label="고정?� ?�제"
        disabled={rosterFull}
        title={`고정 ?�제 ???�?�는 ${UNPIN_PEER_RETENTION_DAYS}??????�� · ROOM?� ?��?`}
        onClick={() => onPinnedChange(false)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
          "bg-amber-500 text-white shadow-sm",
          rosterFull && "cursor-not-allowed opacity-50"
        )}
      >
        <Pin className="size-3.5" aria-hidden />
        고정?�
        <span className="text-[10px] opacity-80">
          {connectedCount}/{PINNED_PEER_SLOTS}
        </span>
      </button>

      <span className="text-[11px] text-[#9CA3AF]">
        {aiLensEnabled ? "?�??· 맥락·Rail" : "?�??· ?�즈 꺼짐"}
      </span>
    </div>
  );
}
