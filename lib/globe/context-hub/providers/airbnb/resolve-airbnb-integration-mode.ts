import type { AirbnbIntegrationMode } from "@/lib/globe/context-hub/providers/airbnb/types";

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/**
 * Rimvio Airbnb integration tier:
 * - partner_api: approved Homes API credentials present
 * - handoff: deep-link to airbnb.com (default until partner approval)
 * - disabled: explicit opt-out via AIRBNB_INTEGRATION_MODE=disabled
 */
export function resolveAirbnbIntegrationMode(): AirbnbIntegrationMode {
  const explicit = readEnv("AIRBNB_INTEGRATION_MODE")?.toLowerCase();
  if (explicit === "disabled") {
    return "disabled";
  }
  if (explicit === "handoff") {
    return "handoff";
  }

  const clientId = readEnv("AIRBNB_PARTNER_CLIENT_ID");
  const clientSecret = readEnv("AIRBNB_PARTNER_CLIENT_SECRET");
  if (clientId && clientSecret) {
    return "partner_api";
  }

  return "handoff";
}

export function isAirbnbPartnerApiConfigured(): boolean {
  return resolveAirbnbIntegrationMode() === "partner_api";
}
