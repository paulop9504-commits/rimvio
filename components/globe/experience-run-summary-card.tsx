"use client";

import { Check, MapPin, Sparkles } from "lucide-react";
import type { ExperienceRunSummary } from "@/lib/experience-run/experience-run-types";
import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import { copy } from "@/lib/copy/human-ko";
import { rimvioHeroCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type ExperienceRunSummaryCardProps = {
  summary: ExperienceRunSummary;
  onDismiss?: () => void;
  className?: string;
};

export function ExperienceRunSummaryCard({
  summary,
  onDismiss,
  className,
}: ExperienceRunSummaryCardProps) {
  const run = copy.globe.experienceRun;

  return (
    <div
      className={cn(
        "space-y-3 rounded-[20px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/[0.04]",
        className,
      )}
      data-experience-run-summary
      data-experience-run-id={summary.runId}
    >
      <div className="space-y-1">
        <p className={cn(RIMVIO_TYPE.eyebrow, "text-primary")}>{run.eyebrow}</p>
        <p className="text-[16px] font-semibold leading-snug text-[#191f28]">
          {summary.titleKo}
        </p>
        <p className="text-[14px] leading-relaxed text-[#4e5968]">{summary.bodyKo}</p>
        {summary.meaningLineKo ? (
          <p className="flex items-start gap-1.5 text-[13px] leading-snug text-[#6b7684]">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#3182f6]" aria-hidden />
            {summary.meaningLineKo}
          </p>
        ) : null}
        {summary.topLodgingName ? (
          <p className="text-[13px] text-[#3182f6]">
            {run.topPick(summary.topLodgingName)}
            {summary.topLodgingReasonKo ? ` · ${summary.topLodgingReasonKo}` : ""}
          </p>
        ) : null}
        {summary.topEateryName ? (
          <p className="text-[13px] text-[#3182f6]">
            {run.topPick(summary.topEateryName)}
            {summary.topEateryReasonKo ? ` · ${summary.topEateryReasonKo}` : ""}
          </p>
        ) : null}
      </div>

      <ul className="space-y-1 border-t border-[#f2f4f6] pt-2.5">
        {summary.steps
          .filter((row) => row.status !== "skipped")
          .map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-2 text-[12px] text-[#8b95a1]"
            >
              <Check
                className={cn(
                  "size-3.5 shrink-0",
                  row.status === "done" ? "text-[#34c759]" : "text-[#d1d6db]",
                )}
                aria-hidden
              />
              <span>{row.labelKo}</span>
            </li>
          ))}
      </ul>

      <button
        type="button"
        className={cn(rimvioHeroCtaClass(), "w-full")}
        onClick={() => {
          requestGlobeAskBridgeFocus(summary.eventId, "map");
          onDismiss?.();
        }}
      >
        <MapPin className="size-4" aria-hidden />
        {run.viewOnMap}
      </button>
    </div>
  );
}
