"use client";

/**
 * Object Place Panel — one clean card: photo → info → why → prepare.
 * Live MobileWorkspaceEntity contract (optional thumbnail / judgment).
 */

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MobileWorkspaceEntity } from "@/lib/mobile-workspace";

export type ObjectPlacePanelProps = {
  readonly entity: MobileWorkspaceEntity;
  readonly imageUrl?: string | null;
  readonly whyLinesKo?: readonly string[] | null;
  readonly judgmentKo?: string | null;
  readonly onClose?: () => void;
  readonly onPrepare?: () => void;
  readonly className?: string;
};

export function ObjectPlacePanel({
  entity,
  imageUrl = null,
  whyLinesKo = null,
  judgmentKo = null,
  onClose,
  onPrepare,
  className,
}: ObjectPlacePanelProps) {
  const hero =
    imageUrl?.trim() ||
    entity.thumbnailUrl?.trim() ||
    entity.galleryUrls?.[0]?.trim() ||
    null;
  const why =
    whyLinesKo?.filter(Boolean) ??
    (entity.subtitleKo ? [entity.subtitleKo] : []);
  const judgment = judgmentKo?.trim() || entity.judgmentKo?.trim() || null;

  return (
    <section
      className={cn(
        "pointer-events-auto flex max-h-[min(52vh,440px)] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_40px_rgba(25,31,40,0.18)]",
        className,
      )}
      data-object-place-panel
      data-entity-id={entity.id}
    >
      <div className="relative h-[min(22vh,180px)] shrink-0 bg-[#eef2f7]">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[28px] text-[#c4c9d0]">
            {entity.kind === "hotel"
              ? "🏨"
              : entity.kind === "restaurant"
                ? "🍜"
                : "📍"}
          </div>
        )}
        {onClose ? (
          <button
            type="button"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <h2 className="text-[17px] font-bold tracking-tight text-[#191f28]">
          {entity.title}
        </h2>
        <p className="mt-1 text-[12px] font-medium text-[#6b7684]">
          {[
            entity.score != null ? `★ ${(entity.score / 10).toFixed(1)}` : null,
            entity.priceLabelKo,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {judgment ? (
          <p className="mt-2 text-[13px] leading-snug text-[#191f28]">
            {judgment}
          </p>
        ) : null}
        {why.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {why.slice(0, 3).map((line) => (
              <li
                key={line}
                className="text-[12px] leading-snug text-[#4e5968]"
              >
                · {line}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {onPrepare ? (
        <div className="shrink-0 border-t border-black/[0.05] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center rounded-2xl bg-[#3182f6] text-[14px] font-extrabold text-white"
            onClick={onPrepare}
          >
            예약 준비
          </button>
        </div>
      ) : null}
    </section>
  );
}
