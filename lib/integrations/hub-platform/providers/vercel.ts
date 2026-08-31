import type { HubConnectionRecord } from "@/lib/integrations/hub-platform/connection-types";

export function resolveVercelConnection(connected = true): HubConnectionRecord {
  return {
    id: "vercel",
    label: "Vercel",
    status: connected ? "verified" : "not_connected",
    oauthCompleted: connected,
    credentialValid: connected,
    apiVerified: connected,
    detailKo: connected ? "Deploy target linked" : "Vercel 프로젝트 연결 필요",
  };
}

export function verifyVercelConnection(connected = true): boolean {
  return connected;
}
