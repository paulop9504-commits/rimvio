"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import {
  evaluateContextConditionAutoReplan,
  type ContextConditionAutoReplanTrigger,
} from "@/lib/globe/context-condition-ai/evaluate-context-condition-auto-replan";
import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { isGlobeContextAgentBound } from "@/lib/globe/context-agent";

const REPLAN_POLL_MS = 5 * 60_000;
const REPLAN_STATE_PREFIX = "rimvio-context-auto-replan.";

function readLastTrigger(contextEventId: string): ContextConditionAutoReplanTrigger | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(`${REPLAN_STATE_PREFIX}${contextEventId}`);
    return (raw as ContextConditionAutoReplanTrigger | null) ?? null;
  } catch {
    return null;
  }
}

function writeLastTrigger(
  contextEventId: string,
  trigger: ContextConditionAutoReplanTrigger,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(`${REPLAN_STATE_PREFIX}${contextEventId}`, trigger);
  } catch {
    /* ignore */
  }
}

/** Bound 맥락 AI — weather/calendar driven replan loop. */
export function useContextConditionAutoReplan(input: {
  enabled: boolean;
  event: EventCandidate | null;
  anchorPlaceName: string;
  spec: LocalDiscoveryActionSpec | null;
  onReplan: (message: string) => Promise<void>;
}) {
  const onReplanRef = useRef(input.onReplan);
  onReplanRef.current = input.onReplan;
  const busyRef = useRef(false);

  useEffect(() => {
    if (!input.enabled || !input.event || !input.spec) {
      return;
    }
    if (!isGlobeContextAgentBound(input.event.id)) {
      return;
    }

    const contextEventId = input.event.id;
    const place = input.anchorPlaceName.trim() || input.event.place?.trim() || "근처";

    const run = async () => {
      if (busyRef.current) {
        return;
      }
      busyRef.current = true;
      try {
        const forecast = await fetchWeatherForecastClient({
          location: place,
          targetIso: new Date().toISOString(),
          eventDate: input.event?.datetime ?? undefined,
        });
        const outcome = evaluateContextConditionAutoReplan({
          event: input.event!,
          spec: input.spec!,
          weather: forecast?.weather ?? null,
          lastTrigger: readLastTrigger(contextEventId),
        });
        if (!outcome) {
          return;
        }
        writeLastTrigger(contextEventId, outcome.trigger);
        toast.message(outcome.reasonKo);
        await onReplanRef.current(outcome.refineMessage);
      } finally {
        busyRef.current = false;
      }
    };

    void run();
    const timer = window.setInterval(() => {
      void run();
    }, REPLAN_POLL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    input.anchorPlaceName,
    input.enabled,
    input.event,
    input.spec,
  ]);
}
