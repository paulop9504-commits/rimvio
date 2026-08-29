/**
 * One-click Hub connect flow (P0).
 * Hub URL → Authenticate → Permission → Discovery → Health → Connected
 */

import type { ConnectedHub, RemoteHubScanResult } from "@/lib/hub/federation/types";
import {
  createConnectedHubDraft,
  upsertConnectedHub,
} from "@/lib/hub/federation/hub-connection-registry";
import { storeHubCredential } from "@/lib/hub/federation/credential-vault";
import { scanRemoteHub } from "@/lib/hub/federation/discovery/remote-hub-scan";
import { probeHubHealth } from "@/lib/hub/federation/health/hub-health-probe";
import { negotiateProtocolVersion } from "@/lib/hub/federation/health/compatibility-check";
import { summarizePermissions } from "@/lib/hub/federation/permission/delegation-policy";
import { RIMVIO_FEDERATION_STANDARD_VERSION } from "@/lib/hub/federation/types";

export type HubConnectInput = {
  readonly hubUrl: string;
  readonly label: string;
  readonly hubId?: string;
  readonly authToken?: string;
  readonly trustLevel?: ConnectedHub["trustLevel"];
};

export type HubConnectResult = {
  readonly ok: boolean;
  readonly hub: ConnectedHub | null;
  readonly scan: RemoteHubScanResult | null;
  readonly summaryKo: string;
  readonly allowedPermissions: readonly string[];
  readonly deniedPermissions: readonly string[];
};

function hubIdFromUrl(url: string, label: string): string {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return `hub.${host.split(".")[0] ?? label.toLowerCase().replace(/\s+/g, "-")}`;
  } catch {
    return `hub.${label.toLowerCase().replace(/\s+/g, "-")}`;
  }
}

/** Full connect pipeline — one-click for developers. */
export async function connectRemoteHub(input: HubConnectInput): Promise<HubConnectResult> {
  const baseUrl = input.hubUrl.replace(/\/$/, "");
  const hubId = input.hubId ?? hubIdFromUrl(baseUrl, input.label);

  let hub = createConnectedHubDraft({
    hubId,
    label: input.label,
    baseUrl: baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`,
    trustLevel: input.trustLevel ?? "partner",
  });

  hub = upsertConnectedHub({ ...hub, status: "pending_auth" });

  const protocol = negotiateProtocolVersion({
    localVersion: RIMVIO_FEDERATION_STANDARD_VERSION,
    remoteVersion: hub.rimvioStandardVersion,
  });
  if (!protocol.ok) {
    return {
      ok: false,
      hub: upsertConnectedHub({ ...hub, status: "error", detailKo: protocol.summaryKo }),
      scan: null,
      summaryKo: protocol.summaryKo,
      allowedPermissions: [],
      deniedPermissions: [],
    };
  }

  if (input.authToken) {
    const cred = storeHubCredential({
      hubId,
      kind: "oauth_token",
      label: `${input.label} OAuth`,
      secret: input.authToken,
    });
    hub = upsertConnectedHub({ ...hub, credentialRef: cred.ref, status: "connected" });
  } else {
    hub = upsertConnectedHub({ ...hub, status: "connected", detailKo: "Demo auth (dev)" });
  }

  const scan = await scanRemoteHub(hub);
  await probeHubHealth(scan.hub);

  const perm = summarizePermissions(scan.permissions);
  const connected = upsertConnectedHub({
    ...scan.hub,
    status: scan.healthSummary.overall === "offline" ? "degraded" : "healthy",
    detailKo: `Connected · ${scan.capabilities.length} capabilities`,
  });

  return {
    ok: true,
    hub: connected,
    scan,
    summaryKo: `${input.label} 연결 완료 · ${scan.capabilities.length} capabilities · ${scan.platforms.length} platforms`,
    allowedPermissions: perm.allowed,
    deniedPermissions: perm.denied,
  };
}
