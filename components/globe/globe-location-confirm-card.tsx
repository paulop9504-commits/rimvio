"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";
import { verifyFeedCaptureEvent } from "@/lib/feed/verify-feed-capture";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { cn } from "@/lib/utils";

export type GlobeLocationConfirmCardProps = {
  className?: string;
};

/** Human confirmation — GPS ingest enriches; user confirms before trust rises. */
export function GlobeLocationConfirmCard({ className }: GlobeLocationConfirmCardProps) {
  const { enabled } = useGpsTrackingEnabled();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const [dismissedIds, setDismissedIds] = useState<readonly string[]>([]);

  const pending = useMemo(() => {
    if (!enabled) {
      return null;
    }
    const events = listLifeEventCandidates();
    return (
      events.find(
        (event) =>
          event.metadata?.targetingSource === "gps_background" &&
          hasPendingFeedCaptureVerify(event) &&
          !dismissedIds.includes(event.id),
      ) ?? null
    );
  }, [enabled, revision, dismissedIds]);

  const onConfirm = useCallback(() => {
    if (!pending) {
      return;
    }
    verifyFeedCaptureEvent(pending.id);
    setRevision((value) => value + 1);
  }, [pending]);

  const onDismiss = useCallback(() => {
    if (!pending) {
      return;
    }
    setDismissedIds((rows) => [...rows, pending.id]);
  }, [pending]);

  if (!pending) {
    return null;
  }

  const place = pending.place?.trim() || "이 위치";
  const title = pending.title?.trim() || "체류 기록";

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#0220470f] bg-white/95 p-3 shadow-sm backdrop-blur-md",
        className,
      )}
      data-globe-location-confirm
    >
      <p className="text-[12px] font-semibold leading-snug text-[#191f28]">
        {place}에서 시간을 보낸 것 같아요.
      </p>
      <p className="mt-0.5 text-[11px] text-[#6b7684]">{title}</p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-[#3182f6] py-2 text-[12px] font-bold text-white active:opacity-90"
          onClick={onConfirm}
        >
          맞아요
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-[#02204714] bg-[#f2f4f6] py-2 text-[12px] font-semibold text-[#6b7684] active:opacity-90"
          onClick={onDismiss}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
