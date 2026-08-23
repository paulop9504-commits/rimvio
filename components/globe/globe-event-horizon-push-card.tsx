"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEventHorizonPush } from "@/hooks/use-event-horizon-push";
import { guardianPushBadge } from "@/lib/guardian-copy";
import { cn } from "@/lib/utils";

export type GlobeEventHorizonPushCardProps = {
  className?: string;
};

/** Event horizon Guardian push — max 1/day, Jarvis tone. */
export function GlobeEventHorizonPushCard({ className }: GlobeEventHorizonPushCardProps) {
  const push = useEventHorizonPush();
  const router = useRouter();

  if (!push.visible || !push.copy) {
    return null;
  }

  const runPrompt = (prompt: string) => {
    router.push(`/search?q=${encodeURIComponent(prompt)}`);
    push.dismiss();
  };

  return (
    <div
      className={cn(
        "pointer-events-auto w-full rounded-2xl border border-amber-400/20 bg-black/60 p-3 text-white shadow-lg backdrop-blur-md",
        className,
      )}
      data-event-horizon-push={push.reason}
      data-event-horizon-kind={push.insightKind ?? "none"}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="inline-flex rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
          {guardianPushBadge(push.copy.tone)}
        </span>
        <button
          type="button"
          aria-label="Guardian 알림 닫기"
          className="shrink-0 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white/80"
          onClick={push.dismiss}
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="text-sm font-medium leading-snug text-white/90">{push.copy.headline}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/60">{push.copy.suggestion}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/18"
          onClick={() =>
            runPrompt("오늘 일정 중 미룰 수 있는 것 찾아서 조정해줘")
          }
        >
          {push.copy.primaryActionLabel}
        </button>
        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/8"
          onClick={() =>
            runPrompt("오늘 꼭 필요한 일만 남기고 나머지 정리해줘")
          }
        >
          {push.copy.secondaryActionLabel}
        </button>
      </div>
    </div>
  );
}

export function GlobeEventHorizonPushOverlay(props: GlobeEventHorizonPushCardProps) {
  return <GlobeEventHorizonPushCard {...props} />;
}
