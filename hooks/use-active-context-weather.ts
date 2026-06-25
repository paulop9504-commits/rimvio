"use client";

import { useEffect, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import {
  bridgeWeatherMatchesExperience,
  readBridgeWeatherFromEvent,
} from "@/lib/globe/bridge-weather/bridge-weather-metadata";
import { resolveBridgeContextWeatherTarget } from "@/lib/globe/resolve-bridge-context-weather-target";

export function useActiveContextWeather(input: {
  event: EventCandidate | null | undefined;
  enabled?: boolean;
}): { tempC: number | null; prepLine: string | null } {
  const [tempC, setTempC] = useState<number | null>(null);
  const [prepLine, setPrepLine] = useState<string | null>(null);

  useEffect(() => {
    if (input.enabled === false || !input.event) {
      setTempC(null);
      setPrepLine(null);
      return;
    }

    const target = resolveBridgeContextWeatherTarget(input.event);
    if (!target) {
      setTempC(null);
      setPrepLine(null);
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
      setTempC(stamped.temperature);
      setPrepLine(`${stamped.condition} · ${stamped.temperature}°C`);
      return;
    }

    let cancelled = false;
    void fetchWeatherForecastClient({
      location: target.location,
      targetIso: target.targetIso,
      eventDate: target.eventDate,
      eventTimeSource: target.eventTimeSource,
    }).then((payload) => {
      if (cancelled) {
        return;
      }
      setTempC(
        payload?.bridge_weather?.temperature ??
          payload?.weather?.temp_c ??
          null,
      );
      setPrepLine(payload?.prep_line ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [input.enabled, input.event]);

  return { tempC, prepLine };
}
