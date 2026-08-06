"use client";

/**
 * DecisionCallout — AI 판단 투영 (정보 카드가 아님).
 *
 * Minimum UI for select judgment:
 *   name · total score · judgmentKo · [선택]
 *
 * Forbidden: price lists · compare tables · search-result cards.
 * Style: Apple Maps floating glass chip.
 */

import type { CSSProperties } from "react";
import type {
  DecisionProjection,
  DecisionProjectionAction,
  DecisionProjectionScores,
  CompareDecisionRelationship,
} from "@/lib/context-workspace/projection/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

/** Wire schema — judgment projection, not inventory facts. */
export type DecisionCalloutModel = {
  readonly mode: "compare_decision";
  readonly entityId: string;
  readonly titleKo: string;
  readonly imageUrl?: string | null;
  readonly scores: DecisionProjectionScores;
  readonly judgmentKo: string;
  readonly relationships: readonly CompareDecisionRelationship[];
  readonly actions: readonly DecisionProjectionAction[];
};

export type DecisionCalloutProps = {
  readonly decision: DecisionCalloutModel | DecisionProjection;
  readonly selected?: boolean;
  readonly onSelect?: (entityId: string) => void;
  readonly className?: string;
  /** Absolute position when hosted on map overlay. */
  readonly style?: CSSProperties;
};

export const DECISION_CALLOUT_WIDTH = 148;

/**
 * Floating Decision Callout — one entity judgment surface.
 */
export function DecisionCallout({
  decision,
  selected = false,
  onSelect,
  className,
  style,
}: DecisionCalloutProps) {
  const canSelect = decision.actions.includes("select");
  const imageUrl = decision.imageUrl?.trim() || null;

  return (
    <article
      className={cn(
        "pointer-events-auto w-[148px] overflow-hidden rounded-[16px]",
        "bg-white/92 shadow-[0_8px_28px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.04]",
        "backdrop-blur-xl",
        selected && "ring-2 ring-[#007aff]/80",
        className,
      )}
      style={style}
      data-decision-callout
      data-mode={decision.mode}
      data-decision-entity={decision.entityId}
      data-decision-total={decision.scores.total}
      aria-label={`${decision.titleKo} · ${decision.scores.total}`}
    >
      {imageUrl ? (
        <div className="relative h-[72px] overflow-hidden bg-[#f2f4f6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5 px-2.5 pb-2.5 pt-2">
        <p className="truncate text-[12px] font-semibold tracking-tight text-[#1c1c1e]">
          {decision.titleKo}
        </p>

        <p className="text-[22px] font-bold leading-none tracking-tight text-[#1c1c1e] tabular-nums">
          {decision.scores.total}
          <span className="ml-1 text-[11px] font-semibold text-[#8e8e93]">
            Score
          </span>
        </p>

        <p className="line-clamp-2 min-h-[2.4em] text-[11px] font-medium leading-snug text-[#3a3a3c]">
          {decision.judgmentKo}
        </p>

        {canSelect ? (
          <button
            type="button"
            className={cn(
              "mt-0.5 w-full rounded-full py-1.5 text-[11px] font-semibold transition-colors",
              selected
                ? "bg-[#1c1c1e] text-white"
                : "bg-[#007aff] text-white active:bg-[#0066d6]",
            )}
            onClick={() => onSelect?.(decision.entityId)}
          >
            {selected
              ? copy.globe.workspacePreviewSelected
              : copy.globe.workspacePreviewSelect}
          </button>
        ) : null}
      </div>
    </article>
  );
}
