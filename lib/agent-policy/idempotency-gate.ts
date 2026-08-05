/**
 * Idempotency — fingerprint + jobId + workspaceRevision (time window = soft assist).
 */

import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { readWorkspaceRevision } from "@/lib/agent-policy/workspace-revision";

/** Soft assist only — primary key is fingerprint::job::revision. */
const IDEMPOTENCY_SOFT_WINDOW_MS = 30_000;

export type IdempotencyGateResult =
  | { readonly ok: true; readonly key: string }
  | {
      readonly ok: false;
      readonly key: string;
      readonly statusKo: string;
    };

export function buildAgentIdempotencyKey(input: {
  readonly utterance: string;
  readonly scoutFingerprint: string;
  readonly jobId: string | null;
  readonly workspaceRevision: string;
  readonly patchKind?: string | null;
  readonly toolId?: string | null;
}): string {
  const u = input.utterance.trim().toLowerCase().replace(/\s+/gu, " ");
  return [
    input.scoutFingerprint,
    input.jobId ?? "",
    input.workspaceRevision,
    input.toolId ?? "",
    input.patchKind ?? "",
    u,
  ].join("::");
}

/**
 * Same request + same Job + same Workspace revision → no-op.
 * Soft window avoids accidental double-submit when revision not yet bumped.
 */
export function resolveIdempotencyGate(input: {
  readonly contextEventId: string;
  readonly key: string;
  readonly nowMs?: number;
}): IdempotencyGateResult {
  const contextEventId = input.contextEventId.trim();
  const state = readContextWorkspace(contextEventId);
  const now = input.nowMs ?? Date.now();
  const prevKey = state?.lastIdempotencyKey?.trim() ?? "";
  const prevAt = state?.lastIdempotencyAtIso
    ? Date.parse(state.lastIdempotencyAtIso)
    : NaN;

  if (prevKey && prevKey === input.key) {
    return {
      ok: false,
      key: input.key,
      statusKo: "같은 상태의 같은 요청은 이미 반영됐어요",
    };
  }

  // Soft: identical utterance fingerprint portion + recent stamp (revision may lag).
  if (
    prevKey &&
    Number.isFinite(prevAt) &&
    now - prevAt < IDEMPOTENCY_SOFT_WINDOW_MS
  ) {
    const prevParts = prevKey.split("::");
    const nextParts = input.key.split("::");
    if (
      prevParts[0] &&
      nextParts[0] &&
      prevParts[0] === nextParts[0] &&
      prevParts[5] &&
      nextParts[5] &&
      prevParts[5] === nextParts[5]
    ) {
      return {
        ok: false,
        key: input.key,
        statusKo: "방금 같은 요청은 이미 반영됐어요",
      };
    }
  }

  return { ok: true, key: input.key };
}

export function stampAgentIdempotencyKey(input: {
  readonly contextEventId: string;
  readonly key: string;
}): void {
  const state = readContextWorkspace(input.contextEventId);
  if (!state) return;
  writeContextWorkspace({
    ...state,
    lastIdempotencyKey: input.key,
    lastIdempotencyAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
  });
}

export function buildIdempotencyKeyForContext(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly scoutFingerprint: string;
  readonly jobId: string | null;
  readonly patchKind?: string | null;
  readonly toolId?: string | null;
}): string {
  const state = readContextWorkspace(input.contextEventId.trim());
  return buildAgentIdempotencyKey({
    utterance: input.utterance,
    scoutFingerprint: input.scoutFingerprint,
    jobId: input.jobId,
    workspaceRevision: readWorkspaceRevision(state),
    patchKind: input.patchKind,
    toolId: input.toolId,
  });
}
