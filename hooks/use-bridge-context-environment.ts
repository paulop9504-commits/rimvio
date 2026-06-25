"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrafficContext } from "@/lib/context-resolver/types";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  bridgeWeatherMatchesExperience,
  readBridgeWeatherFromEvent,
  stampBridgeWeatherOnEvent,
} from "@/lib/globe/bridge-weather/bridge-weather-metadata";
import { formatBridgeWeatherLine } from "@/lib/globe/bridge-weather/format-bridge-weather-line";
import {
  resolveApiWakeupDecision,
} from "@/lib/globe/resource/api-wakeup-controller";
import {
  buildApiWakeupContextFromEvent,
  readAppForeground,
} from "@/lib/globe/resource/build-api-wakeup-context";
import { resolveBridgeContextWeatherTarget } from "@/lib/globe/resolve-bridge-context-weather-target";
import { fetchTrafficContextClient } from "@/lib/traffic/fetch-traffic-context-client";

function formatTrafficLine(traffic: TrafficContext | null): string | null {
  if (!traffic) {
    return null;
  }
  const base = `이동 약 ${traffic.travel_minutes}분`;
  if (traffic.delay_minutes > 0) {
    return `${base} · 지연 ${traffic.delay_minutes}분`;
  }
  return base;
}

export type BridgeContextEnvironment = {
  loading: boolean;
  weatherLine: string | null;
  weatherCondition: string;
  trafficLine: string | null;
  place: string | null;
};

/** Experience-time weather + traffic — gated by ApiWakeupController. */
export function useBridgeContextEnvironment(
  event: EventCandidate | null | undefined,
  enabled = true,
): BridgeContextEnvironment {
  const target = useMemo(
    () => (event && enabled ? resolveBridgeContextWeatherTarget(event) : null),
    [enabled, event],
  );

  const stampedWeather = useMemo(
    () =>
      event && target
        ? readBridgeWeatherFromEvent(event)
        : null,
    [event, target],
  );

  const cachedWeatherLine = useMemo(() => {
    if (!stampedWeather || !target) {
      return null;
    }
    if (
      !bridgeWeatherMatchesExperience({
        stored: stampedWeather,
        eventDate: target.eventDate,
        location: target.location,
      })
    ) {
      return null;
    }
    return formatBridgeWeatherLine(stampedWeather);
  }, [stampedWeather, target]);

  const [appForeground, setAppForeground] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const onVisibility = () => setAppForeground(readAppForeground());
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const weatherDecision = useMemo(() => {
    if (!event || !target) {
      return null;
    }
    const context = buildApiWakeupContextFromEvent({
      event,
      appForeground,
    });
    return resolveApiWakeupDecision("weather_forecast", context);
  }, [appForeground, event, target]);

  const requestKey = target
    ? `${target.location}|${target.targetIso}|${target.eventDate}|${weatherDecision?.phase}|${weatherDecision?.allowFetch}`
    : "";

  const pollIntervalMs = weatherDecision?.pollIntervalMs ?? null;
  const hasValidStamp = Boolean(cachedWeatherLine);

  const [state, setState] = useState<Omit<BridgeContextEnvironment, "place">>({
    loading: false,
    weatherLine: null,
    weatherCondition: "unknown",
    trafficLine: null,
  });

  useEffect(() => {
    if (!target || !enabled) {
      setState({
        loading: false,
        weatherLine: null,
        weatherCondition: "unknown",
        trafficLine: null,
      });
      return;
    }

    if (hasValidStamp && stampedWeather) {
      setState({
        loading: false,
        weatherLine: formatBridgeWeatherLine(stampedWeather),
        weatherCondition: stampedWeather.condition,
        trafficLine: null,
      });
    }
  }, [enabled, hasValidStamp, stampedWeather, target]);

  useEffect(() => {
    if (!target || !enabled || !weatherDecision?.allowFetch) {
      if (!hasValidStamp) {
        setState({
          loading: false,
          weatherLine: null,
          weatherCondition: "unknown",
          trafficLine: null,
        });
      }
      return;
    }

    if (hasValidStamp) {
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    const pull = async () => {
      if (!readAppForeground()) {
        return;
      }

      const [weatherPayload, traffic] = await Promise.all([
        fetchWeatherForecastClient({
          location: target.location,
          targetIso: target.targetIso,
          eventDate: target.eventDate,
          eventTimeSource: target.eventTimeSource,
        }),
        fetchTrafficContextClient({ destination: target.location }),
      ]);

      if (cancelled) {
        return;
      }

      if (weatherPayload?.bridge_weather && event?.id) {
        stampBridgeWeatherOnEvent({
          eventId: event.id,
          weather: weatherPayload.bridge_weather,
        });
      }

      const weatherLine =
        formatBridgeWeatherLine(weatherPayload?.bridge_weather) ??
        weatherPayload?.prep_line?.trim() ??
        null;

      setState({
        loading: false,
        weatherLine,
        weatherCondition: weatherPayload?.weather?.condition ?? "unknown",
        trafficLine: formatTrafficLine(traffic),
      });
    };

    void pull();

    if (pollIntervalMs === null) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(() => void pull(), pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    enabled,
    event?.id,
    hasValidStamp,
    pollIntervalMs,
    requestKey,
    target,
    weatherDecision?.allowFetch,
  ]);

  return {
    ...state,
    weatherLine: state.weatherLine ?? cachedWeatherLine,
    place: target?.location ?? null,
  };
}
