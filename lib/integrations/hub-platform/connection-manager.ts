/**
 * P6 — Hub Platform Connection Manager.
 * Agent tools: connection.list · connection.verify · connection.connect
 */

import type {
  HubConnectionListResult,
  HubConnectionRecord,
  HubPlatformProviderId,
} from "@/lib/integrations/hub-platform/connection-types";
import { resolveGithubConnection, verifyGithubConnection } from "@/lib/integrations/hub-platform/providers/github";
import { resolveStripeConnection, verifyStripeConnection } from "@/lib/integrations/hub-platform/providers/stripe";
import { resolveVercelConnection, verifyVercelConnection } from "@/lib/integrations/hub-platform/providers/vercel";
import { resolveSupabaseConnection, verifySupabaseConnection } from "@/lib/integrations/hub-platform/providers/supabase";

export type HubConnectionFlags = Readonly<Partial<Record<HubPlatformProviderId, boolean>>>;

function resolveOpenAi(connected: boolean): HubConnectionRecord {
  return {
    id: "openai",
    label: "OpenAI",
    status: connected ? "connected" : "not_connected",
    oauthCompleted: false,
    credentialValid: connected,
    apiVerified: connected,
    detailKo: connected ? "API key configured" : "OpenAI key 필요",
  };
}

function resolveMcp(connected: boolean): HubConnectionRecord {
  return {
    id: "mcp",
    label: "MCP Server",
    status: connected ? "connected" : "not_connected",
    oauthCompleted: false,
    credentialValid: connected,
    apiVerified: connected,
    detailKo: connected ? "MCP linked" : "MCP 미연결",
  };
}

export function listHubPlatformConnections(flags: HubConnectionFlags): HubConnectionListResult {
  const connections: HubConnectionRecord[] = [
    resolveGithubConnection(flags.github ?? false),
    resolveOpenAi(flags.openai ?? false),
    resolveStripeConnection(flags.stripe ?? false),
    resolveVercelConnection(flags.vercel ?? false),
    resolveSupabaseConnection(flags.supabase ?? false),
    resolveMcp(flags.mcp ?? false),
  ];

  const disconnected = connections.filter((c) => c.status === "not_connected").length;
  const summaryKo =
    disconnected === 0
      ? "모든 연결이 준비되었습니다."
      : `${disconnected}개 연결 필요`;

  return { connections, summaryKo };
}

export function verifyHubPlatformConnection(
  providerId: HubPlatformProviderId,
  flags: HubConnectionFlags,
): { readonly ok: boolean; readonly record: HubConnectionRecord } {
  const list = listHubPlatformConnections(flags);
  const record = list.connections.find((c) => c.id === providerId)!;

  let ok = false;
  switch (providerId) {
    case "stripe":
      ok = verifyStripeConnection(flags.stripe ?? false);
      break;
    case "github":
      ok = verifyGithubConnection(flags.github ?? false);
      break;
    case "vercel":
      ok = verifyVercelConnection(flags.vercel ?? false);
      break;
    case "supabase":
      ok = verifySupabaseConnection(flags.supabase ?? false);
      break;
    default:
      ok = record.status !== "not_connected";
  }

  return { ok, record };
}

export function connectionFlagsFromRecord(
  flags: HubConnectionFlags,
): Readonly<Record<string, boolean>> {
  return {
    github: flags.github ?? false,
    openai: flags.openai ?? false,
    stripe: flags.stripe ?? false,
    vercel: flags.vercel ?? false,
    supabase: flags.supabase ?? false,
    mcp: flags.mcp ?? false,
  };
}
