"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { GlobeCreateContextPlaceStep } from "@/components/globe/globe-create-context-place-step";
import type { LocationConfirmUxWire, LocationSuggestion } from "@/lib/action-chat/confirmation-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  createManualGlobeContext,
  defaultManualContextStartIso,
} from "@/lib/globe/create-manual-globe-context";
import type { ManualContextResolvedPlace } from "@/lib/globe/resolve-manual-context-place-candidates";
import { suggestionToResolvedPlace } from "@/lib/globe/resolve-manual-context-place-candidates";
import { cn } from "@/lib/utils";

export type GlobeCreateContextSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (input: {
    event: EventCandidate;
    title: string;
    place: string;
  }) => void;
};

type SheetStep = "form" | "place";

/** Manual schedule + globe pin — place verified via Kakao/Google/Naver. */
export function GlobeCreateContextSheet({
  open,
  onOpenChange,
  onCreated,
}: GlobeCreateContextSheetProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<SheetStep>("form");
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [startIso, setStartIso] = useState(defaultManualContextStartIso());
  const [nights, setNights] = useState(1);
  const [busy, setBusy] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeUx, setPlaceUx] = useState<LocationConfirmUxWire | null>(null);
  const [placeSuggestions, setPlaceSuggestions] = useState<LocationSuggestion[]>([]);
  const [mapLinks, setMapLinks] = useState<{ kakao: string; google: string } | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetSheet = useCallback(() => {
    setStep("form");
    setTitle("");
    setPlace("");
    setNights(1);
    setPlaceUx(null);
    setPlaceSuggestions([]);
    setMapLinks(null);
    setPlaceLoading(false);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (open) {
      setStartIso(defaultManualContextStartIso());
    } else {
      resetSheet();
    }
  }, [open, resetSheet]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const commitContext = useCallback(
    async (resolvedPlace?: ManualContextResolvedPlace | null) => {
      setBusy(true);
      try {
        const { event } = createManualGlobeContext({
          title,
          place,
          startIso,
          nights,
          resolvedPlace,
        });
        const label = resolvedPlace?.label.trim() || place.trim();
        toast.success(`${label} 맥락을 지구에 박았어요`);
        onCreated?.({
          event,
          title: title.trim(),
          place: label,
        });
        onOpenChange(false);
        resetSheet();
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "맥락을 만들지 못했어요.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [nights, onCreated, onOpenChange, place, resetSheet, startIso, title],
  );

  const loadPlaceCandidates = useCallback(async () => {
    setPlaceLoading(true);
    setPlaceUx(null);
    setPlaceSuggestions([]);
    setMapLinks(null);
    try {
      const params = new URLSearchParams({
        place: place.trim(),
        title: title.trim(),
      });
      const response = await fetch(`/api/globe/place-candidates?${params.toString()}`);
      if (!response.ok) {
        throw new Error("place_lookup_failed");
      }
      const body = (await response.json()) as {
        ux?: LocationConfirmUxWire;
        suggestions?: LocationSuggestion[];
        mapLinks?: { kakao: string; google: string };
        autoResolved?: ManualContextResolvedPlace | null;
        parsed?: { displayLabel?: string; searchQuery?: string };
      };

      if (body.autoResolved) {
        await commitContext(body.autoResolved);
        return;
      }

      setPlaceUx(body.ux ?? null);
      setPlaceSuggestions(body.suggestions ?? []);
      setMapLinks(body.mapLinks ?? null);
      setStep("place");
    } catch {
      toast.error("장소를 찾지 못했어요. 입력 그대로 박기를 써 주세요.");
      setStep("place");
      setMapLinks({
        kakao: `http://m.map.kakao.com/scheme/search?q=${encodeURIComponent(place.trim())}`,
        google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.trim())}`,
      });
    } finally {
      setPlaceLoading(false);
    }
  }, [commitContext, place, title]);

  const handleFormNext = async () => {
    if (busy || !title.trim() || !place.trim()) {
      return;
    }
    await loadPlaceCandidates();
  };

  const handlePlaceSelect = (suggestion: LocationSuggestion) => {
    if (busy) {
      return;
    }
    void commitContext(suggestionToResolvedPlace(suggestion));
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10050] bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[10051] mx-auto flex w-full max-w-lg max-h-[min(88dvh,640px)] flex-col overflow-hidden rounded-t-[1.25rem] border border-border bg-card shadow-2xl"
            data-globe-create-context-sheet
            data-globe-create-context-step={step}
          >
            <div className="shrink-0 px-4 pt-4">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <p
                    id={titleId}
                    className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground"
                  >
                    <CalendarPlus className="size-4 text-primary" aria-hidden />
                    {step === "place" ? "장소 확인" : "맥락 만들기"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {step === "place"
                      ? "카카오·구글·네이버 후보 중 맞는 곳을 골라요"
                      : "장소 문장을 넣으면 자동으로 지도에 박아요"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full active:bg-muted"
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              {step === "form" ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      무엇이었나요
                    </span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="예: 제주 여행 · 민수 결혼식"
                      className={cn(
                        "w-full rounded-2xl border border-border bg-muted/50 px-4 py-3",
                        "text-[15px] text-foreground outline-none ring-primary/30 focus:ring-2",
                      )}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      어디였나요
                    </span>
                    <input
                      value={place}
                      onChange={(event) => setPlace(event.target.value)}
                      placeholder="예: 약속장소 신림동에서 만나자"
                      className={cn(
                        "w-full rounded-2xl border border-border bg-muted/50 px-4 py-3",
                        "text-[15px] text-foreground outline-none ring-primary/30 focus:ring-2",
                      )}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                        시작
                      </span>
                      <input
                        type="datetime-local"
                        value={startIso.slice(0, 16)}
                        onChange={(event) => setStartIso(event.target.value)}
                        className={cn(
                          "w-full rounded-2xl border border-border bg-muted/50 px-3 py-3",
                          "text-[14px] text-foreground outline-none ring-primary/30 focus:ring-2",
                        )}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                        기간 (박)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={nights}
                        onChange={(event) =>
                          setNights(Math.max(1, Number(event.target.value) || 1))
                        }
                        className={cn(
                          "w-full rounded-2xl border border-border bg-muted/50 px-3 py-3",
                          "text-[14px] text-foreground outline-none ring-primary/30 focus:ring-2",
                        )}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <GlobeCreateContextPlaceStep
                  title={title.trim()}
                  place={place.trim()}
                  startIso={startIso}
                  nights={nights}
                  loading={placeLoading || busy}
                  ux={placeUx}
                  suggestions={placeSuggestions}
                  mapLinks={mapLinks}
                  onSelect={handlePlaceSelect}
                  onUseRawPlace={() => void commitContext(null)}
                  onBack={() => setStep("form")}
                />
              )}
            </div>

            {step === "form" ? (
              <div className="shrink-0 border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <button
                  type="button"
                  disabled={busy || placeLoading || !title.trim() || !place.trim()}
                  onClick={() => void handleFormNext()}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5",
                    "text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.99]",
                    "disabled:pointer-events-none disabled:opacity-45",
                  )}
                  data-globe-create-context-confirm
                >
                  {busy || placeLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      확인 중…
                    </>
                  ) : (
                    "확인"
                  )}
                </button>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                  신림동·강남역처럼 장소를 파싱해 핀을 박아요.
                  <br />
                  애매하면 후보에서 고를 수 있어요.
                </p>
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
