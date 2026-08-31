import type { HubConnectionRecord } from "@/lib/integrations/hub-platform/connection-types";

export function resolveGithubConnection(connected: boolean): HubConnectionRecord {
  return {
    id: "github",
    label: "GitHub",
    status: connected ? "connected" : "not_connected",
    oauthCompleted: connected,
    credentialValid: connected,
    apiVerified: connected,
    detailKo: connected ? "Repository connected" : "GitHub 연결 필요",
  };
}

export function verifyGithubConnection(connected: boolean): boolean {
  return connected;
}
