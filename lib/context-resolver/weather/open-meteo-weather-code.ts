import type { WeatherCondition } from "@/lib/context-resolver/types";

/** WMO weather code → Korean condition label (Open-Meteo). */
export function openMeteoWeatherCodeLabelKo(code: number): string {
  if (code === 0) {
    return "맑음";
  }
  if (code === 1) {
    return "대체로 맑음";
  }
  if (code === 2) {
    return "구름 조금";
  }
  if (code === 3) {
    return "흐림";
  }
  if (code === 45 || code === 48) {
    return "안개";
  }
  if (code >= 51 && code <= 57) {
    return "이슬비";
  }
  if (code >= 61 && code <= 67) {
    return "비";
  }
  if (code >= 71 && code <= 77) {
    return "눈";
  }
  if (code >= 80 && code <= 82) {
    return "소나기";
  }
  if (code >= 85 && code <= 86) {
    return "눈 소나기";
  }
  if (code >= 95) {
    return "뇌우";
  }
  return "흐림";
}

export function openMeteoWeatherCodeToCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) {
    return "clear";
  }
  if (code >= 61 && code <= 67) {
    return "rain";
  }
  if (code >= 80 && code <= 82 || code >= 95) {
    return "rain";
  }
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) {
    return "snow";
  }
  return "unknown";
}
