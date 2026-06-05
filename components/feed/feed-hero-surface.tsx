"use client";

import { memo } from "react";
import { Play } from "lucide-react";
import { PrimaryActionButton } from "@/components/surface-composition/primary-action-button";
import { SurfaceWhyLine } from "@/components/surface-composition/surface-why-line";
import { useSurfacePrimaryUx } from "@/components/surface-composition/surface-primary-ux-context";
import { surfaceTypeVisual } from "@/lib/feed/surface-type-visual";
import { buildSurfaceActionKey } from "@/lib/memory";
import type {
  DispatchSurfaceAction,
  SurfaceNode,
} from "@/lib/surface-composition/surface-node-contract";
import { cn } from "@/lib/utils";

export type FeedHeroSurfaceProps = {
  node: SurfaceNode;
  onDispatch: DispatchSurfaceAction;
};

/** YT Music–style hero: visual + title overlay + circular primary CTA + pill secondaries. */
export const FeedHeroSurface = memo(function FeedHeroSurface({
  node,
  onDispatch,
}: FeedHeroSurfaceProps) {
  const ux = useSurfacePrimaryUx();
  const visual = surfaceTypeVisual(node.type);
  const actionKey = buildSurfaceActionKey(node.id, node.primaryAction.capabilityId);
  const feedback = ux?.getFeedback(actionKey) ?? { phase: "idle" as const };
  const whyLine = ux?.whyLine ?? node.narration?.summary ?? null;
  const loading = feedback.phase === "loading";

  return (
    <section
      className={cn(
        "relative flex min-h-[min(46dvh,400px)] flex-col overflow-hidden rounded-b-[1.75rem] bg-gradient-to-b px-5 pb-5 pt-3",
        visual.heroGradient,
      )}
      data-surface-id={node.id}
      aria-label="지금 할 일"
    >
      <p className="text-[11px] font-medium tracking-wide text-white/45">지금 집중</p>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center">
        <div
          className="flex size-[min(42vw,168px)] items-center justify-center rounded-[1.35rem] bg-black/25 text-[3.5rem] shadow-2xl shadow-black/40 ring-1 ring-white/15"
          aria-hidden
        >
          {visual.emoji}
        </div>
      </div>

      <div className="mt-auto space-y-3">
        <header className="space-y-0.5">
          <h2 className="text-[1.35rem] font-bold leading-tight tracking-tight text-white">
            {node.title}
          </h2>
          {node.description ? (
            <p className="text-[13px] leading-snug text-white/55">{node.description}</p>
          ) : null}
        </header>

        {whyLine ? (
          <div className="[&_*]:text-white/50">
            <SurfaceWhyLine line={whyLine} />
          </div>
        ) : null}

        <div className="flex justify-center pt-1">
          <button
            type="button"
            data-surface-cta="primary"
            data-capability-id={node.primaryAction.capabilityId}
            disabled={loading}
            aria-busy={loading}
            className={cn(
              "flex size-[4.25rem] items-center justify-center rounded-full bg-white text-rimvio-ink shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-transform active:scale-95",
              loading && "opacity-80",
              feedback.phase === "success" && "bg-emerald-400",
              feedback.phase === "error" && "bg-red-400",
            )}
            onClick={() => onDispatch(node, node.primaryAction)}
          >
            {loading ? (
              <span className="text-[13px] font-semibold">…</span>
            ) : feedback.phase === "success" ? (
              <span className="text-[13px] font-bold">✓</span>
            ) : (
              <Play className="ml-0.5 size-7 fill-current" strokeWidth={0} />
            )}
          </button>
        </div>
        <p className="text-center text-[12px] font-medium text-white/70">
          {loading ? "처리 중…" : node.primaryAction.label}
        </p>

        {node.secondaryActions.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {node.secondaryActions.slice(0, 3).map((action) => (
              <button
                key={action.id}
                type="button"
                data-surface-cta="secondary"
                className="rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-[12px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/[0.14]"
                onClick={() => onDispatch(node, action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Screen-reader / no-JS fallback */}
        <div className="sr-only">
          <PrimaryActionButton
            action={node.primaryAction}
            phase={feedback.phase}
            statusMessage={feedback.message}
            onPress={() => onDispatch(node, node.primaryAction)}
          />
        </div>
      </div>
    </section>
  );
});
