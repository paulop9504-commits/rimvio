/**
 * Permission delegation — what Main Agent may invoke on remote hubs (P0).
 */

import type { RemotePermissionAction, RemotePermissionGrant } from "@/lib/hub/federation/types";

export type DelegationCheck = {
  readonly allowed: boolean;
  readonly capabilityId: string;
  readonly action: RemotePermissionAction;
  readonly reasonKo: string;
};

export function checkRemotePermission(input: {
  readonly capabilityId: string;
  readonly action: RemotePermissionAction;
  readonly grants?: readonly RemotePermissionGrant[];
}): DelegationCheck {
  const grants = input.grants ?? [];
  const grant = grants.find(
    (g) => g.capabilityId === input.capabilityId && g.action === input.action,
  );
  if (grant) {
    return {
      allowed: grant.allowed,
      capabilityId: input.capabilityId,
      action: input.action,
      reasonKo: grant.allowed ? "허용됨" : grant.reasonKo ?? "Denied",
    };
  }
  const invokeFallback = grants.find(
    (g) => g.capabilityId === input.capabilityId && g.action === "invoke",
  );
  if (invokeFallback && input.action !== "commit") {
    return {
      allowed: invokeFallback.allowed,
      capabilityId: input.capabilityId,
      action: input.action,
      reasonKo: invokeFallback.allowed ? "invoke grant" : invokeFallback.reasonKo ?? "Denied",
    };
  }
  return {
    allowed: false,
    capabilityId: input.capabilityId,
    action: input.action,
    reasonKo: "권한 정보 없음 — 기본 Deny",
  };
}

export function summarizePermissions(grants: readonly RemotePermissionGrant[]): {
  readonly allowed: readonly string[];
  readonly denied: readonly string[];
} {
  const allowed: string[] = [];
  const denied: string[] = [];
  for (const g of grants) {
    const line = `${g.capabilityId}.${g.action}`;
    if (g.allowed) allowed.push(line);
    else denied.push(line);
  }
  return { allowed, denied };
}

export function filterAllowedCapabilities(
  capabilityIds: readonly string[],
  grants: readonly RemotePermissionGrant[],
): readonly string[] {
  return capabilityIds.filter((id) =>
    checkRemotePermission({ capabilityId: id, action: "invoke", grants }).allowed,
  );
}
