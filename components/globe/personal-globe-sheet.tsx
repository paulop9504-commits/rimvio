"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, X } from "lucide-react";
import { SpatialGlobeStage } from "@/components/experience/spatial-globe-stage";
import { PinExperienceReplaySheet } from "@/components/globe/pin-experience-replay-sheet";
import { usePersonalGlobePins } from "@/hooks/use-personal-globe-pins";
import type { PersonalGlobePinViewer } from "@/lib/globe/personal-globe-pin-types";

export type PersonalGlobeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewer: PersonalGlobePinViewer;
  title?: string;
  subtitle?: string;
  ownerDisplayName?: string;
  onPinProfile?: (pinId: string) => void;
};

export function PersonalGlobeSheet({
  open,
  onOpenChange,
  viewer,
  title,
  subtitle,
  ownerDisplayName = "나",
  onPinProfile,
}: PersonalGlobeSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);
  const { classifiedPins, globe, pinById } = usePersonalGlobePins(viewer);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setActivePinId(null);
      setReplayOpen(false);
    }
  }, [open]);

  const activePin = activePinId ? pinById.get(activePinId) ?? null : null;
  const heading = title ?? (viewer.isOwner ? "내 지구본" : `${ownerDisplayName}의 지구`);
  const hint =
    subtitle ??
    (viewer.isOwner
      ? `핀 ${classifiedPins.length}개 · 전체 경험`
      : `권한 있는 핀 ${classifiedPins.length}개`);

  const replayPin = useMemo(() => activePin, [activePin]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="닫기"
              className="fixed inset-0 z-[84] bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              role="dialog"
              aria-label={heading}
              className="fixed inset-x-0 bottom-0 z-[85] mx-auto flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#06080f] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/25" aria-hidden />
              <header className="flex items-center gap-2 px-4 pb-2 pt-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-sky-500/15 text-sky-200 ring-1 ring-sky-300/25">
                  <Globe className="size-[18px]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold text-white">{heading}</p>
                  <p className="truncate text-[12px] text-white/45">{hint}</p>
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
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {classifiedPins.length === 0 ? (
                  <p className="py-12 text-center text-[13px] leading-relaxed text-white/42">
                    {viewer.isOwner
                      ? "Feed에서 경험을 내 지구본에 박으면\n여기에 슬롯 핀이 쌓여요"
                      : "아직 볼 수 있는 핀이 없어요"}
                  </p>
                ) : (
                  <SpatialGlobeStage
                    globe={globe}
                    classifiedPins={classifiedPins}
                    activePinId={activePinId}
                    variant="card"
                    onPinPress={(pinId) => {
                      setActivePinId(pinId);
                      setReplayOpen(true);
                    }}
                  />
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
      <PinExperienceReplaySheet
        open={replayOpen}
        onOpenChange={setReplayOpen}
        pin={replayPin}
        ownerDisplayName={ownerDisplayName}
        onOpenProfile={
          onPinProfile && replayPin
            ? () => {
                onPinProfile(replayPin.pinId);
                setReplayOpen(false);
              }
            : undefined
        }
      />
    </>,
    document.body,
  );
}
