"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { LocationInlinePick } from "@/components/action-chat/location-inline-pick";
import type {
  LocationConfirmUxWire,
  LocationSuggestion,
} from "@/lib/action-chat/confirmation-types";
import { cn } from "@/lib/utils";

export type GlobeCreateContextPlaceStepProps = {
  title: string;
  place: string;
  startIso: string;
  nights: number;
  loading: boolean;
  ux: LocationConfirmUxWire | null;
  suggestions: LocationSuggestion[];
  mapLinks: { kakao: string; google: string } | null;
  onSelect: (suggestion: LocationSuggestion) => void;
  onUseRawPlace: () => void;
  onBack: () => void;
};

function formatScheduleLine(startIso: string, nights: number): string {
  const start = startIso.slice(0, 16).replace("T", " ");
  return `${start} · ${nights}박`;
}

export function GlobeCreateContextPlaceStep({
  title,
  place,
  startIso,
  nights,
  loading,
  ux,
  suggestions,
  mapLinks,
  onSelect,
  onUseRawPlace,
  onBack,
}: GlobeCreateContextPlaceStepProps) {
  const recommended = suggestions.find((row) => row.id === ux?.recommended_id) ?? suggestions[0];

  return (
    <div className="space-y-4" data-globe-create-context-place-step>
      <div className="rounded-2xl border border-border bg-muted/40 px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          등록한 맥락
        </p>
        <p className="mt-1 text-[15px] font-semibold text-foreground">{title}</p>
        <p className="text-[13px] text-muted-foreground">{place}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {formatScheduleLine(startIso, nights)}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          카카오·구글·네이버에서 장소 찾는 중…
        </div>
      ) : suggestions.length > 0 ? (
        <LocationInlinePick
          prompt={ux?.prompt ?? `${place} — 여기 맞나요?`}
          suggestions={suggestions}
          recommendedId={ux?.recommended_id}
          onSelect={onSelect}
        />
      ) : (
        <div className="space-y-2 rounded-2xl border border-dashed border-border px-3.5 py-3">
          <p className="text-[13px] font-medium text-foreground">
            정확한 후보를 찾지 못했어요
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            카카오맵·구글맵에서 직접 확인한 뒤, 그대로 박거나 다시 검색해 주세요.
          </p>
        </div>
      )}

      {mapLinks ? (
        <div className="flex flex-wrap gap-2">
          <a
            href={mapLinks.kakao}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-2",
              "text-[12px] font-medium text-foreground ring-1 ring-border",
            )}
          >
            <ExternalLink className="size-3.5 text-primary" aria-hidden />
            카카오맵에서 보기
          </a>
          <a
            href={mapLinks.google}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-2",
              "text-[12px] font-medium text-foreground ring-1 ring-border",
            )}
          >
            <ExternalLink className="size-3.5 text-primary" aria-hidden />
            구글맵에서 보기
          </a>
        </div>
      ) : null}

      {!loading && ux?.mode === "quick_pick" && recommended ? (
        <button
          type="button"
          onClick={() => onSelect(recommended)}
          className={cn(
            "flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3.5",
            "text-[15px] font-semibold text-primary-foreground active:scale-[0.99]",
          )}
          data-globe-create-context-place-confirm
        >
          {recommended.branch?.trim() || recommended.label} 맞아요
        </button>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 flex-1 rounded-2xl border border-border px-3 py-2.5 text-[14px] font-medium text-foreground"
        >
          다시 입력
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onUseRawPlace}
          className="min-h-11 flex-1 rounded-2xl border border-border px-3 py-2.5 text-[14px] font-medium text-muted-foreground disabled:opacity-45"
        >
          입력 그대로 박기
        </button>
      </div>
    </div>
  );
}
