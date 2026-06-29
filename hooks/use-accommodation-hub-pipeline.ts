"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  detectAccommodationIntent,
  eventHasAccommodationServiceType,
} from "@/lib/event-kernel";
import { findLifeEventCandidate, EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";
import { runAccommodationHubPipeline } from "@/lib/globe/context-hub/run-accommodation-hub-pipeline";
import { copy } from "@/lib/copy/human-ko";

const AUTO_DEBOUNCE_MS = 600;

/**
 * Context Hub Rail — auto-run accommodation search when kernel intent or service_type matches.
 */
export function useAccommodationHubPipeline(input: {
  activeEventId: string | null | undefined;
  lat?: number | null;
  lng?: number | null;
  enabled?: boolean;
  onCompleted?: () => void;
}) {
  const inflightRef = useRef<string | null>(null);
  const completedRef = useRef<string | null>(null);

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }

    const eventId = input.activeEventId?.trim();
    if (!eventId || input.lat == null || input.lng == null) {
      return;
    }

    const event = findLifeEventCandidate(eventId);
    if (!event) {
      return;
    }

    const message = [event.title, event.description, event.place].filter(Boolean).join(" ");
    const hasIntent =
      eventHasAccommodationServiceType(event) || Boolean(detectAccommodationIntent(message));
    if (!hasIntent) {
      return;
    }

    const revisionKey = `${eventId}|${input.lat.toFixed(3)},${input.lng.toFixed(3)}|${event.updatedAt}`;
    if (completedRef.current === revisionKey || inflightRef.current === revisionKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      inflightRef.current = revisionKey;
      void runAccommodationHubPipeline({
        contextEventId: eventId,
        message,
        lat: input.lat,
        lng: input.lng,
      })
        .then((outcome) => {
          if (outcome) {
            completedRef.current = revisionKey;
            toast.success(copy.globe.lodgingHubConnected);
            input.onCompleted?.();
          }
        })
        .finally(() => {
          if (inflightRef.current === revisionKey) {
            inflightRef.current = null;
          }
        });
    }, AUTO_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [input.activeEventId, input.enabled, input.lat, input.lng, input.onCompleted]);

  useEffect(() => {
    const bump = () => {
      completedRef.current = null;
    };
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);
}
