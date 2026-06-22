"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/copy/human-ko";
import { resolveRimvioHonorific } from "@/lib/copy/rimvio-honorific";
import { pickPulseMemoryCandidate } from "@/lib/globe/trend-bridge/pick-pulse-memory-candidate";
import {
  resolvePulseMainAction,
  type PulseMainActionOffer,
} from "@/lib/globe/trend-bridge/resolve-pulse-main-action";
import type { PinPulsePlaceContext } from "@/lib/globe/trend-bridge/server/fetch-pin-pulse-place-context";
import { loadTrendBridgeSettings } from "@/lib/globe/trend-bridge/trend-bridge-settings";
import { useAuth } from "@/hooks/use-auth";

const DISMISS_KEY = "rimvio-pulse-main-dismissed";

function readDismissedEventId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function dismissPulseMainAction(eventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(DISMISS_KEY, eventId.trim());
  } catch {
    // ignore
  }
}

export function usePulseMainAction(input: {
  enabled: boolean;
  anchorLat: number | null;
  anchorLng: number | null;
  pulseIntent?: "align" | "avoid";
}): {
  offer: PulseMainActionOffer | null;
  loading: boolean;
  dismiss: () => void;
} {
  const { user } = useAuth();
  const honorific = resolveRimvioHonorific(user);
  const [pulse, setPulse] = useState<PinPulsePlaceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(() =>
    readDismissedEventId(),
  );

  const memory = useMemo(() => {
    if (
      input.anchorLat === null ||
      input.anchorLng === null ||
      !Number.isFinite(input.anchorLat) ||
      !Number.isFinite(input.anchorLng)
    ) {
      return null;
    }
    return pickPulseMemoryCandidate({
      anchorLat: input.anchorLat,
      anchorLng: input.anchorLng,
    });
  }, [input.anchorLat, input.anchorLng]);

  useEffect(() => {
    if (!input.enabled || !memory) {
      setPulse(null);
      setLoading(false);
      return;
    }

    const bridgeId =
      loadTrendBridgeSettings().activeBridgeId?.trim() || "food.cafe";
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const params = new URLSearchParams({
          lat: String(memory.lat),
          lng: String(memory.lng),
          placeLabel: memory.placeLabel,
          bridgeId,
        });
        if (memory.captureAtIso) {
          params.set("userCaptureAt", memory.captureAtIso);
        }
        const response = await fetch(
          `/api/globe/trend-bridge/place-context?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error("pulse_context_failed");
        }
        const body = (await response.json()) as {
          context?: PinPulsePlaceContext | null;
        };
        if (!cancelled) {
          setPulse(body.context ?? null);
        }
      } catch {
        if (!cancelled) {
          setPulse(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input.enabled, memory]);

  const offer = useMemo(() => {
    if (!input.enabled || !memory) {
      return null;
    }
    if (dismissedId && dismissedId === memory.eventId) {
      return null;
    }
    return resolvePulseMainAction({
      honorific,
      mode: input.pulseIntent ?? "align",
      memory,
      pulse,
      copy: {
        headlineAlign: copy.globe.pulseMainHeadlineAlign,
        headlineNow: copy.globe.pulseMainHeadlineNow,
        headlineAvoid: copy.globe.pulseMainHeadlineAvoid,
        bodyTaste: copy.globe.pulseMainBodyTaste,
        bodyNow: copy.globe.pulseMainBodyNow,
        bodyPattern: copy.globe.pulseMainBodyPattern,
        bodyAvoid: copy.globe.pulseMainBodyAvoid,
        ctaNavigate: copy.globe.pulseMainCtaNavigate,
        ctaSchedule: copy.globe.pulseMainCtaSchedule,
        ctaNavigateAnyway: copy.globe.pulseMainCtaNavigateAnyway,
      },
    });
  }, [dismissedId, honorific, input.anchorLat, input.anchorLng, input.enabled, input.pulseIntent, memory, pulse]);

  const dismiss = () => {
    if (!offer) {
      return;
    }
    dismissPulseMainAction(offer.eventId);
    setDismissedId(offer.eventId);
  };

  return { offer, loading, dismiss };
}
