"use client";

import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import type { BrainSurfaceDisclosureStage } from "@/lib/globe/brain-surface-progressive-disclosure";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeBrainSurfaceExploreRailProps = {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  activeCandidateId?: string | null;
  disclosureStage?: BrainSurfaceDisclosureStage;
  onSelect: (candidateId: string) => void;
  className?: string;
};

function familyLabel(family: BrainSurfaceProjectionCandidate["family"]): string {
  switch (family) {
    case "media":
      return "영상";
    case "eatery":
      return "맛집";
    case "lodging":
      return "숙소";
    case "trace_place":
      return "단서";
    case "info":
      return "정보";
    case "event":
      return "행사";
    case "memo":
    default:
      return "메모";
  }
}

function familyAccentClass(family: BrainSurfaceProjectionCandidate["family"]): string {
  switch (family) {
    case "media":
      return "border-violet-200/80 bg-violet-50/95 text-violet-950";
    case "eatery":
      return "border-orange-200/80 bg-orange-50/95 text-orange-950";
    case "lodging":
      return "border-sky-200/80 bg-sky-50/95 text-sky-950";
    case "trace_place":
      return "border-emerald-200/80 bg-emerald-50/95 text-emerald-950";
    case "info":
      return "border-blue-200/80 bg-blue-50/95 text-blue-950";
    default:
      return "border-slate-200/80 bg-white/95 text-slate-900";
  }
}

export function GlobeBrainSurfaceExploreRail({
  candidates,
  activeCandidateId,
  disclosureStage = "core",
  onSelect,
  className,
}: GlobeBrainSurfaceExploreRailProps) {
  if (candidates.length === 0) {
    return null;
  }

  const stageLabel =
    disclosureStage === "core"
      ? copy.globe.contextGuideDisclosureCore
      : disclosureStage === "related"
        ? copy.globe.contextGuideDisclosureRelated
        : copy.globe.contextGuideDisclosureDetail;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[28]",
        className,
      )}
      data-globe-brain-surface-explore-rail
      data-disclosure-stage={disclosureStage}
    >
      <div className="mx-auto max-w-[min(100%,28rem)] px-3">
        <div className="rounded-[1.25rem] border border-white/70 bg-white/82 p-2 shadow-[0_12px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl ring-1 ring-black/[0.04]">
          <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              {stageLabel}
            </p>
            {disclosureStage !== "core" ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
                {candidates.length}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {candidates.map((candidate) => {
              const active = candidate.id === activeCandidateId;
              const thumb = candidate.markerThumbnailUrl?.trim();
              if (!thumb && candidate.anchorKind !== "video_root") {
                return null;
              }
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSelect(candidate.id)}
                  className={cn(
                    "flex w-[7.25rem] shrink-0 flex-col overflow-hidden rounded-[0.95rem] border text-left shadow-sm transition active:scale-[0.98]",
                    familyAccentClass(candidate.family),
                    active
                      ? "ring-2 ring-[#0071e3]/35 ring-offset-1 ring-offset-white/80"
                      : "opacity-92 hover:opacity-100",
                  )}
                  data-globe-brain-surface-rail-item={candidate.id}
                  aria-pressed={active}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-[11px] font-semibold text-slate-500">
                        {familyLabel(candidate.family)}
                      </div>
                    )}
                    {candidate.markerMediaKind === "video" ? (
                      <span className="absolute bottom-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        ▶
                      </span>
                    ) : null}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.06em] opacity-70">
                      {familyLabel(candidate.family)}
                    </p>
                    <p className="line-clamp-2 text-[11px] font-semibold leading-snug">
                      {candidate.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
