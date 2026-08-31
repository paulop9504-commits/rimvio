/**
 * Federation agent tools — connect · scan · discover · invoke · health.
 */

import {
  connectRemoteHub,
  listConnectedHubs,
  scanRemoteHub,
  readConnectedHub,
  probeHubHealth,
  searchFederatedCapabilities,
  selectBestFederatedCapability,
  invokeRemoteCapability,
  invokeWithFailover,
  planCrossHubComposition,
  summarizeConnectedHubsForAgent,
  summarizePermissions,
  readCachedHubScan,
} from "@/lib/hub/federation";

export type FederationToolResult =
  | { readonly ok: true; readonly data: unknown; readonly summaryKo: string }
  | { readonly ok: false; readonly error: string };

export async function federationToolConnect(args: {
  readonly hubUrl: string;
  readonly label: string;
}): Promise<FederationToolResult> {
  const result = await connectRemoteHub(args);
  if (!result.ok) return { ok: false, error: result.summaryKo };
  return {
    ok: true,
    data: { hub: result.hub, scan: result.scan, permissions: { allowed: result.allowedPermissions, denied: result.deniedPermissions } },
    summaryKo: result.summaryKo,
  };
}

export async function federationToolList(): Promise<FederationToolResult> {
  const hubs = summarizeConnectedHubsForAgent();
  return {
    ok: true,
    data: hubs,
    summaryKo: hubs.length ? `${hubs.length} connected hubs` : "연결된 Hub 없음",
  };
}

export async function federationToolScan(args: { readonly hubId: string }): Promise<FederationToolResult> {
  const hub = readConnectedHub(args.hubId);
  if (!hub) return { ok: false, error: "Hub not found" };
  const scan = await scanRemoteHub(hub);
  const perm = summarizePermissions(scan.permissions);
  return {
    ok: true,
    data: { scan, permissions: perm },
    summaryKo: `${scan.capabilities.length} capabilities · ${scan.platforms.length} platforms`,
  };
}

export async function federationToolDiscover(args: { readonly query: string }): Promise<FederationToolResult> {
  const hits = searchFederatedCapabilities({ utterance: args.query, limit: 8 });
  const best = selectBestFederatedCapability(args.query);
  const composition = planCrossHubComposition(args.query);
  return {
    ok: true,
    data: { hits, best, composition },
    summaryKo: best ? `Best: ${best.capabilityId} @ ${best.hubLabel}` : "매칭 capability 없음",
  };
}

export async function federationToolInvoke(args: {
  readonly hubId: string;
  readonly capabilityId: string;
  readonly input?: Record<string, unknown>;
}): Promise<FederationToolResult> {
  const result = await invokeRemoteCapability({
    hubId: args.hubId,
    capabilityId: args.capabilityId,
    input: args.input ?? {},
  });
  if (!result.ok) return { ok: false, error: result.errorKo ?? "invoke failed" };
  return { ok: true, data: result, summaryKo: `${args.capabilityId} OK (${result.durationMs}ms)` };
}

export async function federationToolInvokeWithFailover(args: {
  readonly capabilityId: string;
  readonly input?: Record<string, unknown>;
}): Promise<FederationToolResult> {
  const hits = searchFederatedCapabilities({ utterance: args.capabilityId, limit: 6 });
  const scanCaps = listConnectedHubs().flatMap((h) => readCachedHubScan(h.hubId)?.capabilities ?? []);
  const candidates = [...scanCaps, ...hits.map((h) => ({
    capabilityId: h.capabilityId,
    hubId: h.hubId,
    hubLabel: h.hubLabel,
    platformId: h.platformId,
    platformName: h.platformName,
    category: "",
    inputSchema: "",
    outputSchema: "",
    approvalRequired: false,
    keywords: [],
    health: h.health,
    origin: h.origin,
  }))];

  const result = await invokeWithFailover({
    capabilityId: args.capabilityId,
    candidates,
    payload: args.input ?? {},
  });
  if (!result.ok) return { ok: false, error: result.errorKo ?? "failover failed" };
  return {
    ok: true,
    data: result,
    summaryKo: result.failoverNoticeKo ?? `${args.capabilityId} OK`,
  };
}

export async function federationToolHealth(args: { readonly hubId: string }): Promise<FederationToolResult> {
  const hub = readConnectedHub(args.hubId);
  if (!hub) return { ok: false, error: "Hub not found" };
  const probe = await probeHubHealth(hub);
  const scan = readCachedHubScan(args.hubId);
  return {
    ok: true,
    data: { probe, capabilities: scan?.healthSummary.capabilityHealth ?? {} },
    summaryKo: probe.hub.detailKo,
  };
}
