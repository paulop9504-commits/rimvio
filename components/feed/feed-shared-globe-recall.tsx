"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Globe } from "lucide-react";
import { SpatialGlobeStage } from "@/components/experience/spatial-globe-stage";
import { useSharedGlobePins } from "@/hooks/use-shared-globe-pins";
import { globeViewForSharedPins } from "@/lib/peer-chat/globe-view-for-shared-pins";
import { projectSharedGlobeClassifiedPins } from "@/lib/peer-chat/project-thread-globe-pins";
import { peerRoomPath } from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { cn } from "@/lib/utils";

export type FeedSharedGlobeRecallProps = {
  peerThreadId: string;
  className?: string;
};

/** Feed 1층 — ROOM synced shared empty globe (server pins). */
export function FeedSharedGlobeRecall({
  peerThreadId,
  className,
}: FeedSharedGlobeRecallProps) {
  const [expanded, setExpanded] = useState(true);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const { pins, loading } = useSharedGlobePins({
    peerThreadId,
    enabled: Boolean(peerThreadId.trim()),
  });

  const classifiedPins = useMemo(
    () => projectSharedGlobeClassifiedPins(pins),
    [pins],
  );
  const globe = useMemo(
    () => globeViewForSharedPins(classifiedPins),
    [classifiedPins],
  );

  if (!peerThreadId.trim()) {
    return null;
  }

  if (!expanded) {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 text-left",
          className,
        )}
        data-feed-shared-globe-recall
        data-feed-recall-state="mini"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Globe className="size-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">우리 지구</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {loading ? "불러오는 중…" : `핀 ${pins.length}개 · ROOM에서 함께`}
          </p>
        </div>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    );
  }

  return (
    <section
      className={cn("shrink-0 border-b border-border bg-[#f2f3f5]", className)}
      data-feed-shared-globe-recall
      data-feed-recall-state="expanded"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground">우리 지구</p>
          <p className="text-[11px] text-muted-foreground">
            {loading ? "불러오는 중…" : `핀 ${pins.length}개`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={peerRoomPath(peerThreadId)}
            className="rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary"
          >
            ROOM
          </Link>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground"
            aria-label="접기"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <SpatialGlobeStage
        globe={globe}
        classifiedPins={classifiedPins}
        activePinId={activePinId}
        onPinPress={setActivePinId}
        variant="immersive"
        className="min-h-[min(36vh,300px)]"
      />
    </section>
  );
}
