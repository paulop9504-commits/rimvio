"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { SpatialMediaSyncPlayer } from "@/components/experience/spatial-media-sync-player";
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import { projectExperienceClassifiedGlobePings } from "@/lib/feed/project-experience-classified-globe-pings";
import { useFeedGpsPings } from "@/hooks/use-feed-gps-pings";

export type PinExperienceReplaySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pin: PersonalGlobePin | null;
  ownerDisplayName?: string;
  onOpenProfile?: () => void;
};

export function PinExperienceReplaySheet({
  open,
  onOpenChange,
  pin,
  ownerDisplayName = "나",
  onOpenProfile,
}: PinExperienceReplaySheetProps) {
  const [mounted, setMounted] = useState(false);
  const [revision, setRevision] = useState(0);
  const gpsPings = useFeedGpsPings();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const eventsById = useMemo(
    () => indexEventsById(listLifeEventCandidates()),
    [revision],
  );
  const { volumesByEventId } = useExperienceGraph(eventsById);

  const event = pin ? eventsById.get(pin.eventId) : null;
  const volume = pin ? volumesByEventId.get(pin.eventId) ?? null : null;
  const classifiedPins = useMemo(() => {
    if (!pin || !volume) {
      return [];
    }
    return projectExperienceClassifiedGlobePings({
      volume,
      event,
      gpsPings,
      emphasis: "primary",
    });
  }, [pin, volume, event, gpsPings]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && pin ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[90] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={pin.experienceTitle}
            className="fixed inset-x-0 bottom-0 z-[91] mx-auto flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#080a10] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/25" aria-hidden />
            <header className="flex items-center gap-2 px-4 pb-2 pt-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">
                  경험 슬롯
                </p>
                <p className="truncate text-[17px] font-semibold text-white">
                  {pin.experienceTitle}
                </p>
                <p className="mt-0.5 text-[12px] text-white/45">
                  📍 {pin.placeLabel}
                  {pin.photoCount > 0 ? ` · 사진 ${pin.photoCount}` : ""}
                  {pin.videoCount > 0 ? ` · 영상 ${pin.videoCount}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full active:bg-white/10"
                aria-label="닫기"
              >
                <X className="size-5 text-white/70" aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {volume ? (
                <SpatialMediaSyncPlayer volume={volume} classifiedPins={classifiedPins} />
              ) : (
                <p className="py-10 text-center text-[13px] text-white/42">
                  이 경험의 미디어를 불러오지 못했어요
                </p>
              )}
              {onOpenProfile ? (
                <button
                  type="button"
                  className="mt-4 w-full rounded-2xl bg-white/8 py-3 text-[14px] font-semibold text-white/85 active:bg-white/12"
                  onClick={onOpenProfile}
                >
                  {ownerDisplayName} 프로필 보기
                </button>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
