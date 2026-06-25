"use client";

import { useEffect, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import {
  bridgeWeatherMatchesExperience,
  readBridgeWeatherFromEvent,
  stampBridgeWeatherOnEvent,
} from "@/lib/globe/bridge-weather/bridge-weather-metadata";
import { formatBridgeWeatherLine } from "@/lib/globe/bridge-weather/format-bridge-weather-line";
import { resolveBridgeContextWeatherTarget } from "@/lib/globe/resolve-bridge-context-weather-target";

export function useAskRecallWeather(input: {
  event: EventCandidate | null | undefined;
  enabled?: boolean;
}): { weatherLine: string | null; temperature: number | null; loading: boolean } {
  const [weatherLine, setWeatherLine] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (input.enabled === false || !input.event) {
      setWeatherLine(null);
      setTemperature(null);
      setLoading(false);
      return;
    }

    const target = resolveBridgeContextWeatherTarget(input.event);
    if (!target) {
      setWeatherLine(null);
      setTemperature(null);
      return;
    }

    const stamped = readBridgeWeatherFromEvent(input.event);
    if (
      stamped &&
      bridgeWeatherMatchesExperience({
        stored: stamped,
        eventDate: target.eventDate,
        location: target.location,
      })
    ) {
      setWeatherLine(formatBridgeWeatherLine(stamped));
      setTemperature(stamped.temperature);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchWeatherForecastClient({
      location: target.location,
      targetIso: target.targetIso,
      eventDate: target.eventDate,
      eventTimeSource: target.eventTimeSource,
    }).then((payload) => {
      if (cancelled) {
        return;
      }
      const bridgeWeather = payload?.bridge_weather;
      if (bridgeWeather && input.event?.id) {
        stampBridgeWeatherOnEvent({
          eventId: input.event.id,
          weather: bridgeWeather,
        });
      }
      setWeatherLine(
        formatBridgeWeatherLine(bridgeWeather) ??
          payload?.prep_line?.trim() ??
          null,
      );
      setTemperature(
        bridgeWeather?.temperature ?? payload?.weather?.temp_c ?? null,
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [input.enabled, input.event]);

  return { weatherLine, temperature, loading };
}
