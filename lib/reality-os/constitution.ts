/**
 * Reality OS Constitution — Architecture Foundation.
 *
 * Rimvio is not a travel app.
 * Rimvio is a Reality Operating System.
 *
 * @see docs/RIMVIO_CONSTITUTION.md Article 0
 * @see docs/adr/034-reality-os-primitives-projection.md
 *
 * Existing modules (workspace-command, prepare-layer, reality-commit, …)
 * remain the wire implementations. This file is the kernel law SSOT.
 */

/** Ordered Reality OS layers (top → bottom authority for Commit). */
export const REALITY_OS_LAYERS = [
  "globe",
  "context",
  "reality_graph",
  "workspace",
  "agent",
  "draft",
  "simulation",
  "prepare",
  "commit",
] as const;

export type RealityOsLayerId = (typeof REALITY_OS_LAYERS)[number];

/**
 * Five inviolable principles.
 * AI / Agent / Callout code paths must not violate these.
 */
export const REALITY_OS_PRINCIPLES = {
  /** 1. Reality Object는 직접 수정하지 않는다. */
  NO_DIRECT_REALITY_MUTATION:
    "Reality Object is never modified directly — only via Commit after Draft",
  /** 2. 모든 변경은 Workspace Draft를 거친다. */
  ALL_CHANGES_VIA_WORKSPACE_DRAFT:
    "Every mutation enters through Workspace Draft before Reality",
  /** 3. AI는 Commit 권한이 없다. */
  AI_HAS_NO_COMMIT_AUTHORITY:
    "AI / Agent / Callout never Commit — Human Approval Required",
  /** 4. Commit은 User Approval 필요. */
  COMMIT_REQUIRES_USER_APPROVAL:
    "Commit Gate requires explicit user approval (actor: user)",
  /** 5. Globe는 Reality View다. */
  GLOBE_IS_REALITY_VIEW:
    "Globe is a read-only Reality View — Workspace is the Reality Editor",
} as const;

export type RealityOsPrincipleId = keyof typeof REALITY_OS_PRINCIPLES;

export const REALITY_OS_PRODUCT_IDENTITY = {
  isTravelApp: false,
  isRealityOperatingSystem: true,
  oneLinerKo: "맥락이 연결되면, Rimvio가 다시 실행한다.",
  oneLinerEn: "Rimvio is a Reality Operating System — not a travel app.",
} as const;

/** Layer → may mutate what (constitution matrix). */
export const REALITY_OS_LAYER_AUTHORITY: Readonly<
  Record<
    RealityOsLayerId,
    {
      readonly mayMutateReality: boolean;
      readonly mayMutateWorkspaceDraft: boolean;
      readonly mayCommit: boolean;
      readonly roleKo: string;
    }
  >
> = {
  globe: {
    mayMutateReality: false,
    mayMutateWorkspaceDraft: false,
    mayCommit: false,
    roleKo: "Reality View · Projection only",
  },
  context: {
    mayMutateReality: false,
    mayMutateWorkspaceDraft: false,
    mayCommit: false,
    roleKo: "Context Blueprint / Intent shell",
  },
  reality_graph: {
    mayMutateReality: false,
    mayMutateWorkspaceDraft: false,
    mayCommit: false,
    roleKo: "Entity · Relation SSOT (read; Commit writes)",
  },
  workspace: {
    mayMutateReality: false,
    mayMutateWorkspaceDraft: true,
    mayCommit: false,
    roleKo: "Reality Editor · Draft environment",
  },
  agent: {
    mayMutateReality: false,
    mayMutateWorkspaceDraft: true,
    mayCommit: false,
    roleKo: "Reality Operator · Propose only",
  },
  draft: {
    mayMutateReality: false,
    mayMutateWorkspaceDraft: true,
    mayCommit: false,
    roleKo: "Proposed mutation · awaiting Apply",
  },
  simulation: {
    mayMutateReality: false,
    mayMutateWorkspaceDraft: false,
    mayCommit: false,
    roleKo: "SIMULATION_ONLY · predict impact",
  },
  prepare: {
    mayMutateReality: false,
    mayMutateWorkspaceDraft: true,
    mayCommit: false,
    roleKo: "ready_for_commit · never execute",
  },
  commit: {
    mayMutateReality: true,
    mayMutateWorkspaceDraft: false,
    mayCommit: true,
    roleKo: "Human-controlled Reality Transaction + Ledger",
  },
};

export function assertRealityOsPrinciple(
  principle: RealityOsPrincipleId,
  ok: boolean,
  detail?: string,
): void {
  if (ok) return;
  throw new Error(
    `Reality OS Constitution violated · ${principle}: ${REALITY_OS_PRINCIPLES[principle]}${
      detail ? ` · ${detail}` : ""
    }`,
  );
}

/** AI / Agent / Callout attempting Commit. */
export function assertAiCannotCommit(source: string): void {
  const forbidden = new Set(["ai", "agent", "callout", "llm", "operator_auto"]);
  assertRealityOsPrinciple(
    "AI_HAS_NO_COMMIT_AUTHORITY",
    !forbidden.has(source.trim().toLowerCase()),
    `source=${source}`,
  );
}

/** Direct Reality Object write outside Commit path. */
export function assertNoDirectRealityMutation(op: string): void {
  const forbidden = new Set([
    "mutate_reality",
    "write_reality_object",
    "patch_reality_direct",
    "globe_stamp_without_commit",
  ]);
  assertRealityOsPrinciple(
    "NO_DIRECT_REALITY_MUTATION",
    !forbidden.has(op.trim().toLowerCase()),
    `op=${op}`,
  );
}

export function assertCommitRequiresUserApproval(approved: boolean): void {
  assertRealityOsPrinciple(
    "COMMIT_REQUIRES_USER_APPROVAL",
    approved === true,
    "userApproved must be true",
  );
}

export function isGlobeRealityViewOnly(layer: RealityOsLayerId): boolean {
  return layer === "globe" && !REALITY_OS_LAYER_AUTHORITY.globe.mayMutateReality;
}
