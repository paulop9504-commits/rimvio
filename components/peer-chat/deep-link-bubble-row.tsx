"use client";

import { LensActionMediaCard } from "@/components/peer-chat/lens-action-media-card";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { cn } from "@/lib/utils";

type DeepLinkBubbleRowProps = {
  candidates: readonly DeepLinkBubbleCandidate[];
  onSelect: (candidate: DeepLinkBubbleCandidate) => void;
  disabled?: boolean;
  className?: string;
  owner?: {
    displayName: string;
    avatarUrl?: string | null;
    rimvioId?: string | null;
  };
};

/** Suggest-only — 인스타 카드형 탭 실행 (자동 실행 없음) */
export function DeepLinkBubbleRow({
  candidates,
  onSelect,
  disabled = false,
  className,
  owner,
}: DeepLinkBubbleRowProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      role="group"
      aria-label="AI Lens 제안"
    >
      {candidates.map((candidate) => (
        <LensActionMediaCard
          key={candidate.id}
          candidate={candidate}
          onSelect={onSelect}
          disabled={disabled}
          owner={owner}
        />
      ))}
    </div>
  );
}
