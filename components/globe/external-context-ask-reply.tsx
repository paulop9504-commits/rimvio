"use client";

import { Calendar, MapPin, Sparkles, Users } from "lucide-react";
import type { ExternalContextOpportunityHit } from "@/lib/external-context-ask";
import { runGlobeAskExternalAction } from "@/lib/globe/globe-ask-external-action";
import { cn } from "@/lib/utils";

function formatOpportunityDate(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "";
  }
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function ctaLabel(
  cta: ExternalContextOpportunityHit["primaryCta"],
  labels: ExternalContextAskReplyProps["ctaLabels"],
): string {
  switch (cta) {
    case "join":
      return labels.join;
    case "chat":
      return labels.chat;
    case "trade":
      return labels.trade;
    case "view_map":
      return labels.viewMap;
    case "open_bridge":
      return labels.openBridge;
    default:
      return labels.openBridge;
  }
}

export type ExternalContextAskReplyProps = {
  narrative: string;
  hits: readonly ExternalContextOpportunityHit[];
  recommendedHitId?: string | null;
  opportunitiesLabel: string;
  ctaLabels: {
    join: string;
    chat: string;
    trade: string;
    viewMap: string;
    openBridge: string;
  };
  focusAria: (title: string) => string;
  onFocus?: () => void;
  className?: string;
};

export function ExternalContextAskReply({
  narrative,
  hits,
  recommendedHitId,
  opportunitiesLabel,
  ctaLabels,
  focusAria,
  onFocus,
  className,
}: ExternalContextAskReplyProps) {
  const runAction = (hit: ExternalContextOpportunityHit) => {
    runGlobeAskExternalAction({
      cta: hit.primaryCta,
      eventId: hit.eventId,
      threadId: hit.threadId,
    });
    onFocus?.();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {narrative.split("\n\n").map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 12)}`}
            className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#191f28]"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {hits.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8b95a1]">
            {opportunitiesLabel}
          </p>
          <ul className="space-y-3">
            {hits.map((hit) => {
              const when = formatOpportunityDate(hit.atIso);
              const isRecommended = hit.id === recommendedHitId;

              return (
                <li key={hit.id}>
                  <div
                    className={cn(
                      "overflow-hidden rounded-2xl bg-[#f8f9fb] ring-1 ring-black/[0.04]",
                      isRecommended && "ring-[#3182f6]/20",
                    )}
                  >
                    <div className="space-y-2 p-3.5">
                      <div className="flex items-start gap-2">
                        <MapPin
                          className="mt-0.5 size-4 shrink-0 text-[#6b7684]"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-[#191f28]">
                            {hit.title}
                          </p>
                          {isRecommended ? (
                            <p className="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-[#3182f6]">
                              <Sparkles className="size-3.5" aria-hidden />
                              {hit.reasonKo}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[12px] text-[#8b95a1]">
                              {hit.reasonKo}
                            </p>
                          )}
                        </div>
                      </div>

                      <ul className="space-y-1 pl-6 text-[13px] text-[#4e5968]">
                        {hit.placeLabel ? (
                          <li className="flex items-center gap-2">
                            <MapPin className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                            <span>{hit.placeLabel}</span>
                          </li>
                        ) : null}
                        {hit.subtitle ? (
                          <li className="flex items-center gap-2">
                            <Users className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                            <span>
                              {hit.bridgeKindKo} · {hit.subtitle}
                            </span>
                          </li>
                        ) : null}
                        {when ? (
                          <li className="flex items-center gap-2">
                            <Calendar className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                            <span>{when}</span>
                          </li>
                        ) : null}
                      </ul>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          className="rounded-full bg-[#191f28] px-3 py-1.5 text-[12px] font-semibold text-white active:scale-[0.98]"
                          aria-label={focusAria(hit.title)}
                          onClick={() => runAction(hit)}
                        >
                          {ctaLabel(hit.primaryCta, ctaLabels)}
                        </button>
                        {hit.eventId ? (
                          <button
                            type="button"
                            className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#191f28] ring-1 ring-black/[0.06] active:scale-[0.98]"
                            aria-label={focusAria(hit.title)}
                            onClick={() => {
                              runGlobeAskExternalAction({
                                cta: "view_map",
                                eventId: hit.eventId,
                              });
                              onFocus?.();
                            }}
                          >
                            {ctaLabels.viewMap}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
