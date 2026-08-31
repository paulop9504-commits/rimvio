/**
 * Editable platform context values for Dev Hub Context workspace + Preview/Invoke.
 */

const STORAGE_PREFIX = "rimvio.hub.platform-context-values.v1.";

export type PlatformContextValues = {
  readonly destination: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guests: number;
};

export const DEFAULT_PLATFORM_CONTEXT_VALUES: PlatformContextValues = {
  destination: "Namba Station",
  checkIn: "2026-06-15",
  checkOut: "2026-06-17",
  guests: 2,
};

export function readPlatformContextValues(platformId: string): PlatformContextValues {
  if (typeof window === "undefined") return DEFAULT_PLATFORM_CONTEXT_VALUES;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${platformId}`);
    if (!raw) return DEFAULT_PLATFORM_CONTEXT_VALUES;
    const parsed = JSON.parse(raw) as Partial<PlatformContextValues>;
    return {
      destination: parsed.destination?.trim() || DEFAULT_PLATFORM_CONTEXT_VALUES.destination,
      checkIn: parsed.checkIn?.trim() || DEFAULT_PLATFORM_CONTEXT_VALUES.checkIn,
      checkOut: parsed.checkOut?.trim() || DEFAULT_PLATFORM_CONTEXT_VALUES.checkOut,
      guests:
        typeof parsed.guests === "number" && parsed.guests > 0
          ? Math.floor(parsed.guests)
          : DEFAULT_PLATFORM_CONTEXT_VALUES.guests,
    };
  } catch {
    return DEFAULT_PLATFORM_CONTEXT_VALUES;
  }
}

export function writePlatformContextValues(
  platformId: string,
  values: PlatformContextValues,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${platformId}`, JSON.stringify(values));
  } catch {
    // ignore quota
  }
}

export type DevEnvironment = "Development" | "Preview" | "Production";

const ENV_KEY = "rimvio.hub.dev-environment.v1";

export function readDevEnvironment(): DevEnvironment {
  if (typeof window === "undefined") return "Development";
  const raw = localStorage.getItem(ENV_KEY);
  if (raw === "Preview" || raw === "Production" || raw === "Development") return raw;
  return "Development";
}

export function writeDevEnvironment(environment: DevEnvironment): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENV_KEY, environment);
}
