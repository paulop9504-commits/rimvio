import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";

export function resolveSupabaseConnection(connected: boolean): import("@/lib/integrations/hub-platform/connection-types").HubConnectionRecord {
  return {
    id: "supabase",
    label: "Supabase",
    status: connected ? "connected" : "not_connected",
    oauthCompleted: connected,
    credentialValid: connected,
    apiVerified: connected,
    detailKo: connected ? "Database connected" : "Supabase 연결 필요",
  };
}

export function verifySupabaseConnection(connected: boolean): boolean {
  return connected;
}
