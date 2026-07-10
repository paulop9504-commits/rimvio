/**
 * Hub Action Log — append-only transaction timeline inside a Context.
 * Distinct from ContextResource.action (MAIN CTA) and context-action-injection (UI handoff).
 *
 * @see docs/GLOBE_HUB_RESOURCE.md — "3-Layer Storage Model"
 */

export type HubActionType = "search" | "reserve" | "purchase" | "cancel";

export type HubActionStatus = "pending" | "success" | "failed";

export type HubActionApprovalPolicy = "user_tap" | "auto_prep";

export type HubActionSearchPayload = {
  query: string;
  filters?: Record<string, unknown>;
};

export type HubActionReservePayload = {
  slot: { start: string; end: string };
  guestCount?: number;
  /** Vault object_key refs only — no passport plaintext. */
  identityRefs?: import("@/lib/identity-vault/types").HubIdentityRefs;
};

export type HubActionPurchasePayload = {
  amount: number;
  currency: string;
  identityRefs?: import("@/lib/identity-vault/types").HubIdentityRefs;
  /** Partner confirmation (e.g. LiteAPI hotel booking). */
  confirmationCode?: string | null;
  prebookId?: string;
  transactionId?: string;
};

export type HubActionCancelPayload = {
  reason?: string;
};

export type HubActionPayloadByType = {
  search: HubActionSearchPayload;
  reserve: HubActionReservePayload;
  purchase: HubActionPurchasePayload;
  cancel: HubActionCancelPayload;
};

/** Shared columns (folder + optional file FK + audit). */
export type HubActionRecordBase = {
  actionId: string;
  contextEventId: string;
  /** null while search / before Reality Commit binds a Resource. */
  resourceId: string | null;
  status: HubActionStatus;
  externalRef?: string;
  operatorRuntimeId?: string;
  sourceHubId?: string;
  approvalPolicy?: HubActionApprovalPolicy;
  /** cancel (or replace) links to the action it invalidates. */
  supersedesActionId?: string;
  createdAt: string;
};

export type HubActionPayload =
  | { type: "search"; payload: HubActionSearchPayload }
  | { type: "reserve"; payload: HubActionReservePayload }
  | { type: "purchase"; payload: HubActionPurchasePayload }
  | { type: "cancel"; payload: HubActionCancelPayload };

export type HubActionRecord = HubActionRecordBase & HubActionPayload;

export type HubAction = HubActionRecord;

type SharedCreateInput = Omit<
  HubActionRecordBase,
  "actionId" | "status" | "createdAt" | "resourceId"
> & {
  status?: HubActionStatus;
  actionId?: string;
};

function newHubActionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `hub-action-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function baseFields(
  input: SharedCreateInput,
  resourceId: string | null,
): HubActionRecordBase {
  return {
    actionId: input.actionId?.trim() || newHubActionId(),
    contextEventId: input.contextEventId.trim(),
    resourceId,
    status: input.status ?? "pending",
    externalRef: input.externalRef,
    operatorRuntimeId: input.operatorRuntimeId,
    sourceHubId: input.sourceHubId,
    approvalPolicy: input.approvalPolicy,
    supersedesActionId: input.supersedesActionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * search always forces `resourceId: null` (no Resource before Commit).
 * Does not persist — pass through `emitHubActionRecord`.
 */
export function createSearchAction(
  input: SharedCreateInput & {
    payload: HubActionSearchPayload;
    resourceId?: null;
  },
): HubAction {
  return {
    ...baseFields(input, null),
    type: "search",
    payload: input.payload,
  };
}

/** Requires resourceId — Reality Commit already bound the file. */
export function createReserveAction(
  input: SharedCreateInput & {
    resourceId: string;
    payload: HubActionReservePayload;
  },
): HubAction {
  const resourceId = input.resourceId.trim();
  if (!resourceId) {
    throw new Error("hub_action_reserve_requires_resource");
  }
  return {
    ...baseFields(input, resourceId),
    type: "reserve",
    payload: input.payload,
  };
}

export function createPurchaseAction(
  input: SharedCreateInput & {
    resourceId: string;
    payload: HubActionPurchasePayload;
  },
): HubAction {
  const resourceId = input.resourceId.trim();
  if (!resourceId) {
    throw new Error("hub_action_purchase_requires_resource");
  }
  return {
    ...baseFields(input, resourceId),
    type: "purchase",
    payload: input.payload,
  };
}

export function createCancelAction(
  input: SharedCreateInput & {
    resourceId: string;
    supersedesActionId: string;
    payload?: HubActionCancelPayload;
  },
): HubAction {
  const resourceId = input.resourceId.trim();
  const supersedesActionId = input.supersedesActionId.trim();
  if (!resourceId) {
    throw new Error("hub_action_cancel_requires_resource");
  }
  if (!supersedesActionId) {
    throw new Error("hub_action_cancel_requires_supersedes");
  }
  return {
    ...baseFields({ ...input, supersedesActionId }, resourceId),
    type: "cancel",
    payload: input.payload ?? {},
  };
}
