"use client";

import { MapPin, Sparkles } from "lucide-react";
import type { ExternalContextOpportunityHit } from "@/lib/external-context-ask";
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";
import { copy } from "@/lib/copy/human-ko";
import { rimvioHeroCtaClass } from "@/lib/design/rimvio-ontology";
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

export type ExternalContextAskReplyProps = {
  narrative: string;
  hits: readonly ExternalContextOpportunityHit[];
  recommendedHitId?: string | null;
  opportunitiesLabel: string;
  /** @deprecated Globe no longer runs trade/join CTAs — kept for capture-sheet prop compat */
  ctaLabels?: {
    join: string;
    chat: string;
    trade: string;
    viewMap: string;
    openBridge: string;
  };
  focusAria?: (title: string) => string;
  onFocus?: () => void;
  className?: string;
};

/** Discovery-mode ask reply — narrative + read-only hits; actions delegate to Field dashboard. */
export function ExternalContextAskReply({
  narrative,
  hits,
  recommendedHitId,
  opportunitiesLabel,
  onFocus,
  className,
}: ExternalContextAskReplyProps) {
  const field = copy.globe.field;
  const featured =
    hits.find((hit) => hit.id === recommendedHitId) ?? hits[0] ?? null;

  const openField = () => {
    openFieldDashboardIngress({
      tab: "queue",
      primaryEventId: featured?.eventId ?? null,
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

                      {hit.placeLabel || hit.subtitle || when ? (
                        <ul className="space-y-1 pl-6 text-[13px] text-[#4e5968]">
                          {hit.placeLabel ? <li>{hit.placeLabel}</li> : null}
                          {hit.subtitle ? <li>{hit.subtitle}</li> : null}
                          {when ? <li>{when}</li> : null}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(rimvioHeroCtaClass(), "w-full")}
        onClick={openField}
        data-external-ask-field-ingress
      >
        {field.ingressFromGlobeCta}
      </button>
    </div>
  );
}
