/**
 * Sync server-backed Hub connections → client sessionStorage for Agent tools.
 */

import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import {
  setHubConnectionProfile,
  setHubDevConnection,
  type HubDevConnectionId,
} from "@/lib/hub/dev/hub-connection-store";

export type HubConnectionsApiResponse = {
  readonly signedIn: boolean;
  readonly user: {
    readonly id: string;
    readonly email: string | null;
    readonly name: string;
    readonly avatarUrl: string | null;
  } | null;
  readonly connections: ReadonlyArray<{
    readonly provider: HubPlatformProviderId;
    readonly connected: boolean;
    readonly accountLabel: string | null;
    readonly avatarUrl: string | null;
    readonly oauthCompleted: boolean;
    readonly apiVerified: boolean;
    readonly connectedAt: string | null;
  }>;
  readonly oauthConfigured?: Partial<Record<HubPlatformProviderId, boolean>>;
};

export async function fetchHubConnectionsFromServer(): Promise<HubConnectionsApiResponse> {
  const res = await fetch("/api/hub/dev/connections", { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load connections");
  }
  return (await res.json()) as HubConnectionsApiResponse;
}

export function applyHubConnectionsToClientStore(data: HubConnectionsApiResponse): void {
  const hubIds: HubDevConnectionId[] = ["github", "vercel", "supabase", "stripe", "openai", "mcp"];

  for (const id of hubIds) {
    const live = data.connections.find((c) => c.provider === id);
    if (live) {
      setHubDevConnection(id, live.connected && live.oauthCompleted);
      if (live.connected && live.accountLabel) {
        setHubConnectionProfile({
          provider: id,
          accountLabel: live.accountLabel,
          connectedAtIso: live.connectedAt ?? new Date().toISOString(),
          avatarUrl: live.avatarUrl ?? undefined,
        });
      }
    }
  }
}

export async function syncHubConnectionsFromServer(): Promise<HubConnectionsApiResponse> {
  const data = await fetchHubConnectionsFromServer();
  if (data.signedIn) {
    applyHubConnectionsToClientStore(data);
  }
  return data;
}

export async function disconnectHubProviderOnServer(
  provider: HubPlatformProviderId,
): Promise<void> {
  const res = await fetch(`/api/hub/dev/connections/${provider}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to disconnect");
  }
}
