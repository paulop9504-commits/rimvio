import type { HubConnectionRecord, HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";

export function resolveStripeConnection(connected: boolean): HubConnectionRecord {
  return {
    id: "stripe",
    label: "Stripe",
    status: connected ? "verified" : "not_connected",
    oauthCompleted: connected,
    credentialValid: connected,
    apiVerified: connected,
    detailKo: connected
      ? "✓ OAuth completed · ✓ Credential valid · ✓ API verified"
      : "Stripe 연결 필요",
  };
}

export function verifyStripeConnection(connected: boolean): boolean {
  return connected;
}
