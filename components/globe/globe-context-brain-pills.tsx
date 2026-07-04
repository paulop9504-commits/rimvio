"use client";

import { ProjectionNodeIcon } from "@/components/globe/projection-node-icon";
import { globeActionPillStyles } from "@/lib/design/globe-action-pill-styles";
import { resolveProjectionPillPresentation } from "@/lib/situation-projection/projection-node-presentation";
import type { HubRunnablePill } from "@/lib/situation-projection/types";
import { cn } from "@/lib/utils";

export type GlobeContextBrainPillsProps = {
  pills: readonly HubRunnablePill[];
  onPillTap: (pill: HubRunnablePill) => void;
  tone?: "light" | "dark";
  className?: string;
};

function resolveAccentClasses(
  accent: "green" | "blue" | "orange" | "purple",
  tone: "light" | "dark",
) {
  if (tone === "dark") {
    switch (accent) {
      case "green":
        return {
          iconWrap: "bg-[#123725] text-[#6ee7b7]",
          category: "text-[#8cf0c7]",
          relation: "text-white/62",
          emphasis: "ring-[#34c759]/28",
        };
      case "orange":
        return {
          iconWrap: "bg-[#3a2612] text-[#ffb869]",
          category: "text-[#ffc98e]",
          relation: "text-white/62",
          emphasis: "ring-[#ff9500]/30",
        };
      case "purple":
        return {
          iconWrap: "bg-[#2d1d3d] text-[#d8b4fe]",
          category: "text-[#e6ccff]",
          relation: "text-white/62",
          emphasis: "ring-[#bf5af2]/28",
        };
      case "blue":
      default:
        return {
          iconWrap: "bg-[#11263d] text-[#8fd1ff]",
          category: "text-[#b6dcff]",
          relation: "text-white/62",
          emphasis: "ring-[#3182f6]/30",
        };
    }
  }
  switch (accent) {
    case "green":
      return {
        iconWrap: "bg-[#e8f8ed] text-[#15803d]",
        category: "text-[#15803d]",
        relation: "text-[#5f6f67]",
        emphasis: "ring-[#34c759]/18",
      };
    case "orange":
      return {
        iconWrap: "bg-[#fff4e8] text-[#c26a00]",
        category: "text-[#c26a00]",
        relation: "text-[#7d6a52]",
        emphasis: "ring-[#ff9500]/18",
      };
    case "purple":
      return {
        iconWrap: "bg-[#f5edff] text-[#7c3aed]",
        category: "text-[#7c3aed]",
        relation: "text-[#6b5e84]",
        emphasis: "ring-[#bf5af2]/18",
      };
    case "blue":
    default:
      return {
        iconWrap: "bg-[#e8f0fe] text-[#1d4ed8]",
        category: "text-[#1d4ed8]",
        relation: "text-[#61708a]",
        emphasis: "ring-[#3182f6]/18",
      };
  }
}

/** Context card Hub pills — solid vs ghost (dotted ring). */
export function GlobeContextBrainPills({
  pills,
  onPillTap,
  tone = "light",
  className,
}: GlobeContextBrainPillsProps) {
  if (pills.length === 0) {
    return null;
  }

  return (
    <div className={cn(globeActionPillStyles.rowScroll, className)}>
      {pills.map((pill) => {
        const ghost = pill.virtual || pill.kind === "ghost";
        const focus = pill.emphasis === "focus";
        const main = pill.emphasis === "main";
        const aux = pill.emphasis === "aux";
        const presentation = resolveProjectionPillPresentation(pill);
        const relationLabel = pill.relationLabelKo?.trim() || presentation.axisLabelKo;
        const accent = resolveAccentClasses(presentation.discoveryAccent, tone);
        const multiLine = true;
        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => onPillTap(pill)}
            className={cn(
              globeActionPillStyles.buttonBase,
              tone === "dark"
                ? globeActionPillStyles.action.dark
                : globeActionPillStyles.action.light,
              focus && "min-w-[7.2rem] bg-[#0071e3] text-white ring-[#7dc1ff]/40",
              main && !focus && "bg-white/14 ring-white/16",
              aux && "opacity-78",
              multiLine &&
                "min-h-[3.45rem] min-w-[6.6rem] items-start px-3 py-2 text-left",
              ghost &&
                !focus &&
                "border border-dashed border-[#8e8e93]/55 bg-transparent ring-0 opacity-90",
              !ghost && tone === "light" && "bg-[#e8f0fe] text-[#1a4fad] ring-[#007aff]/20",
              !focus && accent.emphasis,
            )}
          >
            {multiLine ? (
              <span className="flex min-w-0 items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    focus ? "bg-white/18 text-white" : accent.iconWrap,
                  )}
                >
                  <ProjectionNodeIcon token={presentation.iconToken} className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-col items-start">
                  <span
                    className={cn(
                      "text-[9px] font-semibold uppercase tracking-[0.08em]",
                      focus ? "text-white/74" : accent.category,
                    )}
                  >
                    {presentation.categoryLabelKo}
                  </span>
                  <span className="truncate text-[12px] font-semibold">
                    {pill.shortLabelKo || pill.labelKo}
                  </span>
                  {relationLabel ? (
                    <span
                      className={cn(
                        "truncate text-[10px]",
                        focus ? "text-white/72" : accent.relation,
                      )}
                    >
                      {relationLabel}
                    </span>
                  ) : null}
                </span>
              </span>
            ) : (
              pill.shortLabelKo || pill.labelKo
            )}
          </button>
        );
      })}
    </div>
  );
}
