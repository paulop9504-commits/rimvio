"use client";

import { memo } from "react";
import type { CapabilityId } from "@/lib/capability-registry";
import { FeedHeroSurface } from "@/components/feed/feed-hero-surface";
import { FeedQueueSheet } from "@/components/feed/feed-queue-sheet";
import { SurfacePrimaryUxProvider } from "@/components/surface-composition/surface-primary-ux-context";
import type { SurfacePrimaryUxValue } from "@/components/surface-composition/surface-primary-ux-context";
import type {
  SurfaceCompositionFrame,
  SurfaceNode,
} from "@/lib/surface-composition/surface-node-contract";
import { cn } from "@/lib/utils";

export type FeedSlotStageProps = {
  frame: SurfaceCompositionFrame;
  primaryUx?: SurfacePrimaryUxValue;
  onDispatchCapability: (
    node: SurfaceNode,
    actionId: string,
    capabilityId: CapabilityId,
  ) => void;
  onAskAi: () => void;
  askAiLabel: string;
  className?: string;
};

export const FeedSlotStage = memo(function FeedSlotStage({
  frame,
  primaryUx,
  onDispatchCapability,
  onAskAi,
  askAiLabel,
  className,
}: FeedSlotStageProps) {
  const primary = frame.layout.primary;
  const latent = frame.graph.latentSurfaces;

  const onDispatch = (node: SurfaceNode, action: { id: string; capabilityId: CapabilityId }) => {
    onDispatchCapability(node, action.id, action.capabilityId);
  };

  const body = (
    <div
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      data-feed-slot-stage
      data-active-surface-id={frame.collapse.activeSurfaceId ?? undefined}
      data-latent-count={latent.length}
    >
      {primary ? (
        <FeedHeroSurface node={primary} onDispatch={onDispatch} />
      ) : (
        <div className="flex min-h-[40dvh] flex-col items-center justify-center rounded-b-[1.75rem] bg-gradient-to-b from-[#2a2030] to-rimvio-base px-6 text-center">
          <p className="text-[17px] font-semibold text-white/85">오늘 할 일</p>
          <p className="mt-2 text-[13px] text-white/45">맥락이 쌓이면 여기에 한 가지가 떠요</p>
        </div>
      )}

      <FeedQueueSheet
        primary={primary}
        latent={latent}
        onDispatch={onDispatch}
        onAskAi={onAskAi}
        askAiLabel={askAiLabel}
      />
    </div>
  );

  if (!primaryUx) {
    return body;
  }

  return <SurfacePrimaryUxProvider value={primaryUx}>{body}</SurfacePrimaryUxProvider>;
});
