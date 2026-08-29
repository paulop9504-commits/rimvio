/**
 * Remote capability execution + automatic failover (P0/P1).
 */

import type {
  FederatedCapabilityRef,
  RemoteInvokeInput,
  RemoteInvokeResult,
} from "@/lib/hub/federation/types";
import { readConnectedHub } from "@/lib/hub/federation/hub-connection-registry";
import { resolveCredentialForExecution } from "@/lib/hub/federation/credential-vault";
import { checkRemotePermission } from "@/lib/hub/federation/permission/delegation-policy";
import { readCachedHubScan } from "@/lib/hub/federation/discovery/remote-hub-scan";
import { SHOPPING_HUB_ID } from "@/lib/hub/federation/seeds/shopping-hub-seed";

function simulateInvoke(
  cap: FederatedCapabilityRef,
  input: Readonly<Record<string, unknown>>,
): { readonly ok: boolean; readonly output?: Record<string, unknown>; readonly errorKo?: string } {
  if (cap.health === "offline") {
    return { ok: false, errorKo: `${cap.capabilityId} Offline` };
  }
  if (cap.capabilityId === "product.search") {
    const maxPrice = Number(input.maxPriceKrw ?? input.budget ?? 100_000);
    return {
      ok: true,
      output: {
        items: [
          { id: "p1", name: "무선 이어폰 A", priceKrw: 89_000 },
          { id: "p2", name: "무선 이어폰 B", priceKrw: 79_000 },
        ].filter((i) => i.priceKrw <= maxPrice),
        provider: cap.hubLabel,
      },
    };
  }
  if (cap.capabilityId === "hotel.search") {
    return { ok: true, output: { hotels: [{ name: "Swissotel Osaka", priceKrw: 462_000 }] } };
  }
  if (cap.capabilityId === "restaurant.search") {
    return { ok: true, output: { restaurants: [{ name: "Dotonbori Grill" }] } };
  }
  if (cap.capabilityId === "train.route") {
    return { ok: true, output: { routes: [{ line: "JR Osaka Loop", minutes: 18 }] } };
  }
  return { ok: true, output: { capability: cap.capabilityId, ok: true } };
}

/** Execute capability on remote hub (HTTP in prod; demo simulate). */
export async function invokeRemoteCapability(input: RemoteInvokeInput): Promise<RemoteInvokeResult> {
  const started = Date.now();
  const hub = readConnectedHub(input.hubId);
  if (!hub) {
    return {
      ok: false,
      hubId: input.hubId,
      capabilityId: input.capabilityId,
      errorKo: "Hub not connected",
      durationMs: Date.now() - started,
      routedVia: "primary",
      attemptedHubIds: [input.hubId],
    };
  }

  const scan = readCachedHubScan(input.hubId);
  const cap = scan?.capabilities.find((c) => c.capabilityId === input.capabilityId);
  if (!cap) {
    return {
      ok: false,
      hubId: input.hubId,
      capabilityId: input.capabilityId,
      errorKo: "Capability not found on remote hub",
      durationMs: Date.now() - started,
      routedVia: "primary",
      attemptedHubIds: [input.hubId],
    };
  }

  const perm = checkRemotePermission({
    capabilityId: input.capabilityId,
    action: "invoke",
    grants: scan?.permissions ?? [],
  });
  if (scan?.permissions?.length && !perm.allowed) {
    return {
      ok: false,
      hubId: input.hubId,
      capabilityId: input.capabilityId,
      errorKo: perm.reasonKo,
      durationMs: Date.now() - started,
      routedVia: "primary",
      attemptedHubIds: [input.hubId],
    };
  }

  const credRef = input.credentialRef ?? hub.credentialRef;
  if (credRef) {
    const resolved = resolveCredentialForExecution(credRef);
    if (!resolved.ok && hub.trustLevel !== "partner" && hub.trustLevel !== "sandbox") {
      return {
        ok: false,
        hubId: input.hubId,
        capabilityId: input.capabilityId,
        errorKo: "Credential invalid",
        durationMs: Date.now() - started,
        routedVia: "primary",
        attemptedHubIds: [input.hubId],
      };
    }
  }

  const result = simulateInvoke(cap, input.input);
  return {
    ok: result.ok,
    hubId: input.hubId,
    capabilityId: input.capabilityId,
    output: result.output,
    errorKo: result.errorKo,
    durationMs: Date.now() - started,
    routedVia: "primary",
    attemptedHubIds: [input.hubId],
  };
}

/** Automatic failover — try ranked hubs for same capability. */
export async function invokeWithFailover(input: {
  readonly capabilityId: string;
  readonly candidates: readonly FederatedCapabilityRef[];
  readonly payload: Readonly<Record<string, unknown>>;
}): Promise<RemoteInvokeResult & { readonly failoverNoticeKo?: string }> {
  const exact = input.candidates.filter((c) => c.capabilityId === input.capabilityId);
  const pool = exact.length > 0 ? exact : input.candidates;
  const ranked = [...pool].sort((a, b) => healthRank(a.health) - healthRank(b.health));

  const attempted: string[] = [];
  for (const cap of ranked) {
    attempted.push(cap.hubId);
    const result = await invokeRemoteCapability({
      hubId: cap.hubId,
      capabilityId: cap.capabilityId,
      input: input.payload,
    });
    if (result.ok) {
      const failoverNoticeKo =
        attempted.length > 1
          ? `첫 번째 공급자가 응답하지 않아 ${cap.hubLabel}로 전환했습니다.`
          : undefined;
      return { ...result, routedVia: attempted.length > 1 ? "failover" : "primary", attemptedHubIds: attempted, failoverNoticeKo };
    }
  }

  return {
    ok: false,
    hubId: ranked[0]?.hubId ?? SHOPPING_HUB_ID,
    capabilityId: input.capabilityId,
    errorKo: "모든 Provider 실패",
    durationMs: 0,
    routedVia: "failover",
    attemptedHubIds: attempted,
    failoverNoticeKo: "대체 공급자를 찾을 수 없습니다.",
  };
}

function healthRank(h: FederatedCapabilityRef["health"]): number {
  return h === "healthy" ? 0 : h === "degraded" ? 1 : h === "unknown" ? 2 : 3;
}
