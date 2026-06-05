"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { surfaceTypeVisual } from "@/lib/feed/surface-type-visual";
import type { RankedSurface, SurfaceType } from "@/lib/surface-engine/surface-contract";
import type {
  DispatchSurfaceAction,
  SurfaceNode,
} from "@/lib/surface-composition/surface-node-contract";
import { cn } from "@/lib/utils";

export type FeedQueueSheetProps = {
  primary: SurfaceNode | null;
  latent: readonly RankedSurface[];
  onDispatch: DispatchSurfaceAction;
  onAskAi: () => void;
  askAiLabel: string;
};

type QueueFilter = "all" | SurfaceType;

function asDispatchNode(surface: RankedSurface): SurfaceNode {
  return {
    ...surface,
    layoutSlot: "secondary",
    mfeId: "GenericSurfaceMF",
    capabilityBindings: {
      primary: surface.primaryAction.capabilityId,
      secondary: surface.secondaryActions.map((a) => a.capabilityId),
    },
    uiComponents: [],
  };
}

function buildQueueRows(
  primary: SurfaceNode | null,
  latent: readonly RankedSurface[],
): RankedSurface[] {
  const rows: RankedSurface[] = [];
  if (primary) {
    for (const action of primary.secondaryActions.slice(3)) {
      rows.push({
        ...primary,
        id: `${primary.id}:sec:${action.id}`,
        title: action.label,
        description: primary.title,
        primaryAction: { ...action, kind: "primary" },
        secondaryActions: [],
      });
    }
  }
  rows.push(...latent);
  return rows.slice(0, 8);
}

export const FeedQueueSheet = memo(function FeedQueueSheet({
  primary,
  latent,
  onDispatch,
  onAskAi,
  askAiLabel,
}: FeedQueueSheetProps) {
  const [filter, setFilter] = useState<QueueFilter>("all");
  const rows = useMemo(() => buildQueueRows(primary, latent), [primary, latent]);

  const chips = useMemo(() => {
    const types = new Set<SurfaceType>();
    for (const row of rows) {
      types.add(row.type);
    }
    return ["all" as const, ...Array.from(types)];
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return rows;
    }
    return rows.filter((row) => row.type === filter);
  }, [filter, rows]);

  return (
    <section
      className="mt-auto flex max-h-[min(48dvh,420px)] min-h-[11rem] flex-col rounded-t-[1.75rem] border-t border-white/10 bg-[#0c0c0e] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
      aria-label="다음에 할 일"
    >
      <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/25" aria-hidden />

      <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
            다음에 할 일
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-white">오늘 큐</p>
        </div>
        <button
          type="button"
          onClick={onAskAi}
          className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-semibold text-white/85 transition-colors hover:bg-white/10"
        >
          {askAiLabel}
        </button>
      </header>

      {chips.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => {
            const label =
              chip === "all" ? "전체" : surfaceTypeVisual(chip).chipLabel;
            const active = filter === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setFilter(chip)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/75 hover:bg-white/15",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-[13px] text-white/40">
            다른 일정은 비어 있어요
          </li>
        ) : (
          filtered.map((row) => {
            const visual = surfaceTypeVisual(row.type);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.1]"
                  onClick={() => onDispatch(asDispatchNode(row), row.primaryAction)}
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xl">
                    {visual.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-white">
                      {row.title}
                    </p>
                    <p className="truncate text-[12px] text-white/45">
                      {row.description || row.primaryAction.label}
                    </p>
                  </div>
                  <GripVertical
                    className="size-4 shrink-0 text-white/20"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })
        )}
      </ul>

      <p className="sr-only">
        <Link href="/search">검색 탭에서 AI에게 더 물어보기</Link>
      </p>
    </section>
  );
});
