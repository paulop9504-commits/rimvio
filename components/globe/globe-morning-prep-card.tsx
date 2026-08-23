"use client";

import { X } from "lucide-react";
import { PrepSurfaceBoard } from "@/components/action-chat/prep-surface-board";
import { RealtimeLoopStrip } from "@/components/surface-composition/realtime-loop-strip";
import { useMorningAutoPrepSurface } from "@/hooks/use-morning-auto-prep-surface";
import { cn } from "@/lib/utils";

export type GlobeMorningPrepCardProps = {
  onSpawnPrompt?: (uri: string) => void;
  className?: string;
};

/** MORNING_LOOP unlock — Jarvis briefing + optional prep rows on Globe home. */
export function GlobeMorningPrepCard({
  onSpawnPrompt,
  className,
}: GlobeMorningPrepCardProps) {
  const morning = useMorningAutoPrepSurface();

  if (!morning.visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-auto w-full rounded-2xl border border-white/10 bg-black/55 p-3 text-white shadow-lg backdrop-blur-md",
        className,
      )}
      data-morning-auto-prep={morning.reason}
      data-morning-loop={morning.dominantLoop ?? "none"}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <RealtimeLoopStrip
          loopType={morning.dominantLoop}
          overrideApplied
          className="px-0 pb-0"
        />
        <button
          type="button"
          aria-label="아침 준비 닫기"
          className="shrink-0 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white/80"
          onClick={morning.dismiss}
        >
          <X className="size-4" />
        </button>
      </div>

      {morning.briefingLoading ? (
        <p className="text-xs leading-relaxed text-white/55">아침 브리핑 준비 중…</p>
      ) : morning.briefing ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium leading-snug text-white/90">
            {morning.briefing.greeting}
          </p>
          <p className="text-xs leading-relaxed text-white/60">
            {morning.briefing.daily_insight.summary}
          </p>
        </div>
      ) : null}

      {morning.showPrepRows && morning.prepSurface.rows.length > 0 ? (
        <div className="mt-3 border-t border-white/10 pt-3 [&_p]:text-white/45 [&_.text-muted-foreground]:text-white/45">
          <PrepSurfaceBoard prepSurface={morning.prepSurface} onSpawnPrompt={onSpawnPrompt} />
        </div>
      ) : null}
    </div>
  );
}

/** Self-contained overlay for Globe home chrome stack. */
export function GlobeMorningPrepOverlay(props: GlobeMorningPrepCardProps) {
  return <GlobeMorningPrepCard {...props} />;
}
