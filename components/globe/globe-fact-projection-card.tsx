"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  readFactProjection,
  subscribeFactProjection,
  type FactProjectionState,
} from "@/lib/fact-query/fact-projection-store";
import { cn } from "@/lib/utils";

export type GlobeFactProjectionCardProps = {
  className?: string;
  onFlyTo?: (input: { lat: number; lng: number; labelKo: string }) => void;
};

export function GlobeFactProjectionCard({
  className,
  onFlyTo,
}: GlobeFactProjectionCardProps) {
  const [state, setState] = useState<FactProjectionState | null>(() =>
    readFactProjection(),
  );

  useEffect(() => {
    setState(readFactProjection());
    return subscribeFactProjection((next) => {
      setState(next);
      const highlight =
        next.wire.evidence.find((e) => e.id === next.wire.highlightId) ??
        next.wire.evidence[0];
      if (highlight && onFlyTo) {
        onFlyTo({
          lat: highlight.lat,
          lng: highlight.lng,
          labelKo: highlight.labelKo,
        });
      }
    });
  }, [onFlyTo]);

  if (!state?.wire) {
    return null;
  }

  const wire = state.wire;
  const highlight =
    wire.evidence.find((e) => e.id === wire.highlightId) ?? wire.evidence[0];

  return (
    <div
      className={cn(
        "pointer-events-auto w-full rounded-2xl border border-cyan-400/20 bg-black/60 p-3 text-white shadow-lg backdrop-blur-md",
        className,
      )}
      data-fact-projection={wire.kind}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="inline-flex rounded-md bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/90">
          Fact · 지도
        </span>
        <button
          type="button"
          aria-label="닫기"
          className="shrink-0 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white/80"
          onClick={() => setState(null)}
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="text-sm font-medium leading-snug text-white/90">{wire.headlineKo}</p>
      {highlight ? (
        <p className="mt-1 text-xs text-white/55">
          핀: {highlight.labelKo} · {wire.sourceKo}
        </p>
      ) : null}
    </div>
  );
}

export function GlobeFactProjectionOverlay(props: GlobeFactProjectionCardProps) {
  return <GlobeFactProjectionCard {...props} />;
}
