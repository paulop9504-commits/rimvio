"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  clearGlobePlacePendingVerify,
  readGlobePlacePendingVerify,
  shouldAskGpsOffAfterVerify,
} from "@/lib/globe/globe-place-pending-verify";
import { markGlobeLocationConfirmed } from "@/lib/globe/globe-location-confirm-store";
import { resolveGlobeContextPlaceLabel } from "@/lib/globe/globe-context-card-coords";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import { setGpsTrackingEnabled } from "@/lib/location-ping/gps-tracking-settings";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobePlaceVerifyCardProps = {
  eventId: string | null;
  className?: string;
  onDismiss?: () => void;
  onPlaceConfirmed?: () => void;
};


/** Zoomed map verify → GPS off prompt when tracking was on. */
export function GlobePlaceVerifyCard({
  eventId,
  className,
  onDismiss,
  onPlaceConfirmed,
}: GlobePlaceVerifyCardProps) {
  const [revision, setRevision] = useState(0);
  const [gpsOffPrompt, setGpsOffPrompt] = useState(false);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const key = eventId?.trim() ?? "";
  const event = useMemo(() => {
    if (!key) {
      return null;
    }
    return findLifeEventCandidate(key);
  }, [key, revision]);

  const verifySource = event ? readGlobePlacePendingVerify(event) : null;

  useEffect(() => {
    setGpsOffPrompt(false);
  }, [key]);

  const onConfirmPlace = useCallback(() => {
    if (!event) {
      return;
    }
    const place = resolveGlobeContextPlaceLabel(event);
    if (place) {
      markGlobeLocationConfirmed(place, event.datetime);
    }
    clearGlobePlacePendingVerify(event);
    onPlaceConfirmed?.();
    if (shouldAskGpsOffAfterVerify(event)) {
      setGpsOffPrompt(true);
      return;
    }
    onDismiss?.();
  }, [event, onDismiss, onPlaceConfirmed]);

  const onRejectPlace = useCallback(() => {
    if (!event) {
      return;
    }
    clearGlobePlacePendingVerify(event);
    toast.message(copy.globe.placeVerifyRejectedToast);
    onDismiss?.();
  }, [event, onDismiss]);

  const onGpsOff = useCallback(() => {
    setGpsTrackingEnabled(false);
    onDismiss?.();
  }, [onDismiss]);

  const onGpsKeep = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  if (!event) {
    return null;
  }

  if (gpsOffPrompt) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-[1.35rem] bg-white/94 p-4 shadow-[0_8px_32px_rgba(2,32,71,0.14)] ring-1 ring-black/[0.06] backdrop-blur-xl",
          className,
        )}
        data-globe-place-verify
        data-globe-place-verify-phase="gps_off"
      >
        <p className="text-[15px] font-semibold leading-snug text-foreground">
          {copy.globe.placeVerifyGpsOffTitle}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {copy.globe.placeVerifyGpsOffBody}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-primary py-2.5 text-[13px] font-bold text-primary-foreground active:opacity-90"
            onClick={onGpsOff}
          >
            {copy.globe.placeVerifyGpsOffConfirm}
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-muted py-2.5 text-[13px] font-semibold text-muted-foreground active:opacity-90"
            onClick={onGpsKeep}
          >
            {copy.globe.placeVerifyGpsOffKeep}
          </button>
        </div>
      </div>
    );
  }

  if (!verifySource) {
    return null;
  }

  const place = resolveGlobeContextPlaceLabel(event);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.35rem] bg-white/94 p-4 shadow-[0_8px_32px_rgba(2,32,71,0.14)] ring-1 ring-black/[0.06] backdrop-blur-xl",
        className,
      )}
      data-globe-place-verify
      data-globe-place-verify-phase="place"
    >
      <p className="text-[15px] font-semibold leading-snug text-foreground">
        {copy.globe.placeVerifyTitle(place)}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {copy.globe.placeVerifyBody}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-primary py-2.5 text-[13px] font-bold text-primary-foreground active:opacity-90"
          onClick={onConfirmPlace}
        >
          {copy.globe.placeVerifyConfirm}
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl bg-muted py-2.5 text-[13px] font-semibold text-muted-foreground active:opacity-90"
          onClick={onRejectPlace}
        >
          {copy.globe.placeVerifyReject}
        </button>
      </div>
    </div>
  );
}
