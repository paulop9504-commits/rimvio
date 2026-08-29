/**
 * P6 — Hub Platform connection types (Stripe · GitHub · Vercel).
 * Distinct from user Integration OAuth catalog (Slack, Notion, …).
 */

export type HubPlatformProviderId = "stripe" | "github" | "openai" | "vercel" | "supabase" | "mcp";

export type HubConnectionStatus = "not_connected" | "oauth_pending" | "connected" | "verified" | "error";

export type HubConnectionRecord = {
  readonly id: HubPlatformProviderId;
  readonly label: string;
  readonly status: HubConnectionStatus;
  readonly oauthCompleted: boolean;
  readonly credentialValid: boolean;
  readonly apiVerified: boolean;
  readonly detailKo: string;
};

export type HubConnectionListResult = {
  readonly connections: readonly HubConnectionRecord[];
  readonly summaryKo: string;
};
