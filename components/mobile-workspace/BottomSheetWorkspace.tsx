"use client";

/**
 * Bottom Sheet Workspace — Level 2 (expanded ~50%) + Level 3 (full).
 * Swipe up expand · swipe down collapse.
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type {
  MobileCalloutMode,
  MobileWorkspaceEntity,
  MobileWorkspaceRelation,
} from "@/lib/mobile-workspace";

export type BottomSheetWorkspaceProps = {
  readonly mode: Exclude<MobileCalloutMode, "compact">;
  readonly entity: MobileWorkspaceEntity;
  readonly relations: readonly MobileWorkspaceRelation[];
  readonly evidenceKo?: readonly string[];
  readonly onExpand?: () => void;
  readonly onCollapse?: () => void;
  readonly onCompare?: () => void;
  readonly onPinAnchor?: () => void;
  readonly onAddSchedule?: () => void;
  readonly onPrepare?: () => void;
  readonly className?: string;
};

export function BottomSheetWorkspace({
  mode,
  entity,
  relations,
  evidenceKo = [],
  onExpand,
  onCollapse,
  onCompare,
  onPinAnchor,
  onAddSchedule,
  onPrepare,
  className,
}: BottomSheetWorkspaceProps) {
  const startY = useRef<number | null>(null);
  const isFull = mode === "full";
  const nearby = relations.filter(
    (r) => r.fromId === entity.id || r.toId === entity.id,
  );

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 bottom-0 z-[30] flex justify-center",
        className,
      )}
      data-mobile-bottom-sheet
      data-mode={mode}
    >
      <div
        className={cn(
          "flex w-full max-w-[480px] flex-col rounded-t-[28px] bg-[#111114]/94 shadow-[0_-12px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-2xl",
          isFull
            ? "h-[min(92dvh,920px)]"
            : "h-[min(52dvh,480px)]",
        )}
        onTouchStart={(e) => {
          startY.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          const y0 = startY.current;
          const y1 = e.changedTouches[0]?.clientY;
          startY.current = null;
          if (y0 == null || y1 == null) return;
          const dy = y1 - y0;
          if (dy < -48) onExpand?.();
          if (dy > 48) onCollapse?.();
        }}
      >
        <div className="flex justify-center pb-1 pt-2.5">
          <span className="h-1 w-10 rounded-full bg-white/25" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <header className="mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-white/40">
              {entity.kind}
            </p>
            <h2 className="text-[22px] font-bold tracking-[-0.02em] text-white">
              {entity.title}
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-white/60">
              {entity.score != null ? `Match ${entity.score}%` : null}
              {entity.score != null && entity.priceLabelKo ? " · " : null}
              {entity.priceLabelKo}
            </p>
          </header>

          {evidenceKo.length > 0 ? (
            <section className="mb-4">
              <p className="mb-1.5 text-[11px] font-bold text-white/40">
                Evidence
              </p>
              <ul className="space-y-1">
                {evidenceKo.map((line) => (
                  <li
                    key={line}
                    className="text-[14px] font-medium text-white/85"
                  >
                    ✓ {line}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mb-4">
            <p className="mb-1.5 text-[11px] font-bold text-white/40">
              Relationship
            </p>
            {nearby.length === 0 ? (
              <p className="text-[13px] text-white/50">연결된 관계가 없어요</p>
            ) : (
              <ul className="space-y-1.5">
                {nearby.slice(0, isFull ? 12 : 5).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl bg-white/5 px-3 py-2 text-[13px] font-semibold text-white/85"
                  >
                    {r.labelKo}
                    {r.walkMinutes != null
                      ? ` · 도보 ${r.walkMinutes}분`
                      : r.meters != null
                        ? ` · ${r.meters}m`
                        : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isFull ? (
            <section className="mb-4 space-y-2">
              <p className="text-[11px] font-bold text-white/40">
                Workspace · Simulation · Prepare
              </p>
              <p className="text-[13px] leading-relaxed text-white/65">
                Full sheet에서 관계·시뮬·준비까지 이어갈 수 있어요. Commit은
                Field에서만.
              </p>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <SheetAction label="비교" onClick={onCompare} />
            <SheetAction label="고정" onClick={onPinAnchor} />
            <SheetAction label="일정 추가" onClick={onAddSchedule} />
            <SheetAction label="예약 준비" primary onClick={onPrepare} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetAction({
  label,
  primary,
  onClick,
}: {
  label: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-[44px] rounded-full px-4 text-[14px] font-bold",
        primary
          ? "bg-white text-black"
          : "bg-white/10 text-white ring-1 ring-white/15",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
