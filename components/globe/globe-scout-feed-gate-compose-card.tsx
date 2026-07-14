"use client";

import { copy } from "@/lib/copy/human-ko";
import type { ScoutFeedGateVideoContextWire } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { GlobeScoutFeedGateVideoStrip } from "@/components/globe/globe-scout-feed-gate-video-strip";
import { cn } from "@/lib/utils";

export type ScoutDomainCorrectionChipView = {
  readonly id: string;
  readonly labelKo: string;
};

export type GlobeScoutFeedGateComposeCardProps = {
  summaryKo: string;
  count: number;
  opened?: boolean;
  superseded?: boolean;
  busy?: boolean;
  aiInsightKo?: string;
  tipsKo?: readonly string[];
  highlightTitles?: readonly string[];
  videoContext?: ScoutFeedGateVideoContextWire | null;
  correctionChips?: readonly ScoutDomainCorrectionChipView[];
  onConfirm: () => void;
  onCorrectionChip?: (chipId: string) => void;
  className?: string;
};

/** Scout complete — user must tap [확인하기] before map + discovery feed open. */
export function GlobeScoutFeedGateComposeCard({
  summaryKo,
  count,
  opened = false,
  superseded = false,
  busy = false,
  aiInsightKo,
  tipsKo = [],
  highlightTitles = [],
  videoContext = null,
  correctionChips = [],
  onConfirm,
  onCorrectionChip,
  className,
}: GlobeScoutFeedGateComposeCardProps) {
  const tips = tipsKo.filter((row) => row.trim().length > 0);
  const highlights = highlightTitles.filter((row) => row.trim().length > 0);
  const corrections = correctionChips.filter((row) => row.labelKo.trim().length > 0);
  const showCorrections =
    !opened && !superseded && corrections.length > 0 && Boolean(onCorrectionChip);

  return (
    <div
      className={cn("max-w-[92%] space-y-2.5", className)}
      data-globe-scout-feed-gate-card
    >
      <div className="space-y-2.5 rounded-[1.1rem] bg-white px-3 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]">
        <div className="space-y-1">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">
            {copy.globe.scoutFeedGateIntro(count)}
          </p>
          <p className="text-[12px] leading-relaxed text-[#636366]">{summaryKo}</p>
        </div>

        {highlights.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
              {copy.globe.scoutFeedGateHighlightsLabel}
            </span>
            {highlights.map((title) => (
              <span
                key={title}
                className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[11px] font-medium text-[#1d1d1f] ring-1 ring-black/[0.04]"
              >
                {title}
              </span>
            ))}
          </div>
        ) : null}

        {aiInsightKo ? (
          <div className="rounded-xl bg-[#0071e3]/[0.05] px-2.5 py-2 ring-1 ring-[#0071e3]/10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#0071e3]/80">
              {copy.globe.scoutFeedGateAiLabel}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#1d1d1f]">
              {aiInsightKo}
            </p>
          </div>
        ) : null}

        {tips.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
              {copy.globe.scoutFeedGateTipsLabel}
            </p>
            <ul className="space-y-1">
              {tips.map((tip) => (
                <li
                  key={tip}
                  className="text-[11px] leading-relaxed text-[#515154] before:mr-1 before:text-[#0071e3] before:content-['·']"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {videoContext ? (
          <GlobeScoutFeedGateVideoStrip videoContext={videoContext} />
        ) : null}

        {showCorrections ? (
          <div
            className="space-y-1.5 border-t border-black/[0.04] pt-2.5"
            data-globe-scout-domain-correction
          >
            <p className="text-[11px] font-medium text-[#86868b]">
              {copy.globe.scoutFeedGateCorrectionHint}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {corrections.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onCorrectionChip?.(chip.id)}
                  className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[12px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.06] active:scale-[0.98] disabled:opacity-60"
                  data-globe-scout-domain-correction-chip={chip.id}
                >
                  {chip.labelKo}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {opened ? (
        <p className="px-1 text-[11px] font-medium text-[#0071e3]">
          {copy.globe.scoutFeedGateOpened}
        </p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={cn(
            "w-full rounded-full px-4 py-3 text-[14px] font-semibold shadow-sm active:scale-[0.99] disabled:opacity-60",
            superseded
              ? "bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-black/[0.06]"
              : "bg-[#0071e3] text-white",
          )}
          data-globe-scout-feed-gate-confirm
        >
          {superseded
            ? copy.globe.scoutFeedGateArchiveCta
            : copy.globe.scoutFeedGateConfirmCta}
        </button>
      )}
    </div>
  );
}
