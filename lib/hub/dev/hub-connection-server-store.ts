/**
 * Hub Platform connections — persisted per user in user_integrations.
 */

import {
  deleteIntegrationForUser,
  listIntegrationsForUser,
  readIntegrationSecretForUser,
  upsertIntegrationForUser,
} from "@/lib/integrations/integrations-server-store";
import type { IntegrationProviderId, IntegrationSecretPayload } from "@/lib/integrations/types";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import { verifyHubOAuthLive } from "@/lib/hub/dev/hub-platform-oauth-server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type HubLiveConnectionRecord = {
  readonly provider: HubPlatformProviderId;
  readonly connected: boolean;
  readonly accountLabel: string | null;
  readonly avatarUrl: string | null;
  readonly oauthCompleted: boolean;
  readonly apiVerified: boolean;
  readonly connectedAt: string | null;
};

const HUB_STORAGE_PROVIDERS: readonly HubPlatformProviderId[] = [
  "github",
  "vercel",
  "supabase",
  "stripe",
];

export function hubProviderStorageId(provider: HubPlatformProviderId): IntegrationProviderId {
  return `hub_${provider}` as IntegrationProviderId;
}

export function hubProviderFromStorageId(id: string): HubPlatformProviderId | null {
  if (!id.startsWith("hub_")) return null;
  const provider = id.slice(4) as HubPlatformProviderId;
  return HUB_STORAGE_PROVIDERS.includes(provider) ? provider : null;
}

export async function upsertHubConnectionForUser(
  supabase: SupabaseClient,
  input: {
    userId: string;
    provider: HubPlatformProviderId;
    secret: IntegrationSecretPayload;
    label: string;
    avatarUrl?: string;
  },
): Promise<HubLiveConnectionRecord> {
  const storageId = hubProviderStorageId(input.provider);
  const verified = await verifyHubOAuthLive(input.provider, input.secret);

  await upsertIntegrationForUser(supabase, {
    userId: input.userId,
    provider: storageId,
    authKind: "oauth",
    secret: input.secret,
    label: input.label,
    status: verified ? "connected" : "error",
  });

  return {
    provider: input.provider,
    connected: true,
    accountLabel: input.label,
    avatarUrl: input.avatarUrl ?? null,
    oauthCompleted: true,
    apiVerified: verified,
    connectedAt: new Date().toISOString(),
  };
}

export async function deleteHubConnectionForUser(
  supabase: SupabaseClient,
  userId: string,
  provider: HubPlatformProviderId,
): Promise<void> {
  await deleteIntegrationForUser(supabase, userId, hubProviderStorageId(provider));
}

export async function listHubConnectionsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<readonly HubLiveConnectionRecord[]> {
  const all = await listIntegrationsForUser(supabase, userId);
  const hubRecords = all.filter((r) => r.provider.startsWith("hub_"));

  const results: HubLiveConnectionRecord[] = [];

  for (const provider of HUB_STORAGE_PROVIDERS) {
    const storageId = hubProviderStorageId(provider);
    const publicRecord = hubRecords.find((r) => r.provider === storageId);
    if (!publicRecord || publicRecord.status === "revoked") {
      results.push({
        provider,
        connected: false,
        accountLabel: null,
        avatarUrl: null,
        oauthCompleted: false,
        apiVerified: false,
        connectedAt: null,
      });
      continue;
    }

    const secret = await readIntegrationSecretForUser(supabase, userId, storageId);
    const apiVerified = secret ? await verifyHubOAuthLive(provider, secret) : false;

    results.push({
      provider,
      connected: publicRecord.status === "connected",
      accountLabel: publicRecord.label,
      avatarUrl: null,
      oauthCompleted: true,
      apiVerified,
      connectedAt: publicRecord.connectedAt,
    });
  }

  return results;
}

export async function readHubConnectionSecretForUser(
  supabase: SupabaseClient,
  userId: string,
  provider: HubPlatformProviderId,
): Promise<IntegrationSecretPayload | null> {
  return readIntegrationSecretForUser(supabase, userId, hubProviderStorageId(provider));
}
