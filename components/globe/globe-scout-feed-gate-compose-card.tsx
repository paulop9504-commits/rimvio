"use client";

import { copy } from "@/lib/copy/human-ko";
import type { ScoutFeedGateVideoContextWire } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { GlobeScoutFeedGateVideoStrip } from "@/components/globe/globe-scout-feed-gate-video-strip";
import { cn } from "@/lib/utils";

export type GlobeScoutFeedGateComposeCardProps = {
  summaryKo: string;
  count: number;
  opened?: boolean;
  busy?: boolean;
  aiInsightKo?: string;
  tipsKo?: readonly string[];
  highlightTitles?: readonly string[];
  videoContext?: ScoutFeedGateVideoContextWire | null;
  onConfirm: () => void;
  className?: string;
};

/** Scout complete — user must tap [확인하기] before map + discovery feed open. */
export function GlobeScoutFeedGateComposeCard({
  summaryKo,
  count,
  opened = false,
  busy = false,
  aiInsightKo,
  tipsKo = [],
  highlightTitles = [],
  videoContext = null,
  onConfirm,
  className,
}: GlobeScoutFeedGateComposeCardProps) {
  const tips = tipsKo.filter((row) => row.trim().length > 0);
  const highlights = highlightTitles.filter((row) => row.trim().length > 0);

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
          className="w-full rounded-full bg-[#0071e3] px-4 py-3 text-[14px] font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
          data-globe-scout-feed-gate-confirm
        >
          {copy.globe.scoutFeedGateConfirmCta}
        </button>
      )}
    </div>
  );
}
