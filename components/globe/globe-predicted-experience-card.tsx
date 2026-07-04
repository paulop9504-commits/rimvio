"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { PredictedExperienceCardModel } from "@/lib/globe/predicted-experience/build-predicted-experience-card";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobePredictedExperienceCardProps = {
  model: PredictedExperienceCardModel;
  tone?: "light" | "dark";
  className?: string;
};

export function GlobePredictedExperienceCard({
  model,
  tone = "light",
  className,
}: GlobePredictedExperienceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const dark = tone === "dark";

  return (
    <section
      className={cn(
        "rounded-[1rem] border p-3 shadow-sm",
        dark
          ? "border-white/12 bg-white/[0.06] text-white"
          : "border-black/[0.06] bg-white text-[#1d1d1f]",
        className,
      )}
      data-globe-predicted-experience-card
      data-globe-predicted-experience-tone={tone}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                dark
                  ? "bg-[#8f6aff]/16 text-[#d8cbff] ring-1 ring-[#8f6aff]/24"
                  : "bg-[#f3edff] text-[#6d4aff] ring-1 ring-[#d8ccff]",
              )}
            >
              <Sparkles className="size-3" aria-hidden />
              {copy.globe.predictedExperienceTitle}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                dark
                  ? "bg-white/8 text-white/72 ring-1 ring-white/12"
                  : "bg-black/[0.04] text-[#6e6e73] ring-1 ring-black/[0.05]",
              )}
            >
              {model.confidenceLabelKo}
            </span>
          </div>
          <p
            className={cn(
              "mt-2 text-[13px] font-semibold leading-snug",
              dark ? "text-white" : "text-[#1d1d1f]",
            )}
          >
            {model.summaryKo}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium active:scale-[0.98]",
            dark
              ? "bg-white/8 text-white/72 ring-1 ring-white/10"
              : "bg-black/[0.04] text-[#6e6e73] ring-1 ring-black/[0.05]",
          )}
        >
          <span className="inline-flex items-center gap-1">
            {expanded
              ? copy.globe.predictedExperienceCollapseCta
              : copy.globe.predictedExperienceExpandCta}
            {expanded ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
          </span>
        </button>
      </div>

      {model.signalBadges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {model.signalBadges.map((badge) => (
            <span
              key={badge.id}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                dark
                  ? "bg-white/7 text-white/70 ring-1 ring-white/8"
                  : "bg-[#f5f5f7] text-[#6e6e73] ring-1 ring-black/[0.05]",
              )}
            >
              {badge.labelKo}
            </span>
          ))}
        </div>
      ) : null}

      {model.supportBulletsKo.length > 0 ? (
        <ul
          className={cn(
            "mt-2 space-y-1 text-[12px] leading-relaxed",
            dark ? "text-white/78" : "text-[#4b5563]",
          )}
        >
          {model.supportBulletsKo.map((line) => (
            <li key={line}>- {line}</li>
          ))}
        </ul>
      ) : null}

      {expanded ? (
        <div className="mt-3 space-y-3">
          <div>
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.08em]",
                dark ? "text-white/52" : "text-[#86868b]",
              )}
            >
              {copy.globe.predictedExperienceNarrativeTitle}
            </p>
            <p
              className={cn(
                "mt-1 text-[12px] leading-relaxed",
                dark ? "text-white/84" : "text-[#3a3a3c]",
              )}
            >
              {model.narrativeKo}
            </p>
          </div>
          {model.provenance.length > 0 ? (
            <div>
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.08em]",
                  dark ? "text-white/52" : "text-[#86868b]",
                )}
              >
                {copy.globe.predictedExperienceProvenanceTitle}
              </p>
              <div className="mt-1.5 space-y-1.5">
                {model.provenance.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-[0.8rem] px-2.5 py-2",
                      dark ? "bg-white/[0.04]" : "bg-[#f5f5f7]",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[10px] font-semibold",
                        dark ? "text-white/55" : "text-[#86868b]",
                      )}
                    >
                      {item.labelKo}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[11px] leading-relaxed",
                        dark ? "text-white/84" : "text-[#3a3a3c]",
                      )}
                    >
                      {item.detailKo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
