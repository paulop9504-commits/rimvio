/**
 * Reality Draft Engine
 *
 * AI does not change Reality.
 * Every change creates a Draft · human Apply → approved.
 *
 * Draft = { before, after, impact, status }
 * status = proposed | approved | rejected
 */

import {
  buildDraftDiff,
  buildDraftDiffFromIntent,
  formatDraftDiffUxKo,
  type DraftSnapshot,
  type RealityDraftDiff,
} from "@/lib/draft/diff";
import type { DraftImpact } from "@/lib/draft/impact";
import {
  applyDraftMutation,
  rejectDraftMutation,
} from "@/lib/workspace-command/apply-draft-mutation";
import { proposeDraftAction } from "@/lib/workspace-command/draft-action-engine";
import { createWorkspaceCommand } from "@/lib/workspace-command/command-parser";
import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import {
  createWorkspace,
  readWorkspace,
  readWorkspaceByContext,
} from "@/lib/workspace/workspace-store";

export const REALITY_DRAFT_STATUSES = [
  "proposed",
  "approved",
  "rejected",
] as const;

export type RealityDraftStatus = (typeof REALITY_DRAFT_STATUSES)[number];

export type RealityDraft = {
  readonly id: string;
  readonly workspaceId: string;
  readonly before: DraftSnapshot;
  readonly after: DraftSnapshot;
  readonly impact: DraftImpact;
  readonly status: RealityDraftStatus;
  /** Linked workspace-command DraftMutation id (optional wire) */
  readonly workspaceDraftId: string | null;
  readonly sourceText: string;
  readonly intent: WorkspaceIntent | null;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  /** Article 0 — Draft never is a Reality Commit */
  readonly draftOnly: true;
};

export type CreateDraftInput = {
  readonly workspaceId: string;
  readonly before: DraftSnapshot;
  readonly after: DraftSnapshot;
  readonly impact?: DraftImpact;
  readonly sourceText?: string;
  readonly intent?: WorkspaceIntent | null;
  readonly workspaceDraftId?: string | null;
};

export type DraftApplyResult =
  | {
      readonly ok: true;
      readonly draft: RealityDraft;
      readonly applyLabelKo: "Apply";
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
      readonly forbiddenRealityMutation?: boolean;
    };

const store = new Map<string, RealityDraft>();

function newId(): string {
  return `rdraft_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function ensureWs(workspaceId: string) {
  return (
    readWorkspace(workspaceId) ??
    readWorkspaceByContext(workspaceId) ??
    createWorkspace({ id: workspaceId, contextId: workspaceId })
  );
}

/**
 * AI / Agent / Callout must never claim direct Reality mutation.
 * Allowed path for AI = createDraft (proposed) only.
 */
export function assertAiDoesNotMutateReality(actor: string): void {
  const a = actor.trim().toLowerCase();
  if (
    a === "ai" ||
    a === "agent" ||
    a === "assistant" ||
    a === "llm" ||
    a === "callout"
  ) {
    throw new Error(
      `Article 0: ${actor} cannot mutate Reality — create Draft only`,
    );
  }
}

/**
 * Create Draft — status always "proposed".
 * AI path: propose Diff only. Does not touch Global Reality.
 */
export function createDraft(input: CreateDraftInput): RealityDraft {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) {
    throw new Error("workspaceId required for Draft");
  }

  const diff =
    input.impact != null
      ? {
          before: input.before,
          after: input.after,
          impact: input.impact,
        }
      : buildDraftDiff({
          before: input.before,
          after: input.after,
        });

  const now = new Date().toISOString();
  const draft: RealityDraft = {
    id: newId(),
    workspaceId,
    before: diff.before,
    after: diff.after,
    impact: diff.impact,
    status: "proposed",
    workspaceDraftId: input.workspaceDraftId ?? null,
    sourceText: input.sourceText?.trim() ?? "",
    intent: input.intent ?? null,
    createdAtIso: now,
    updatedAtIso: now,
    draftOnly: true,
  };

  store.set(draft.id, draft);
  return draft;
}

/**
 * Intent → Diff → Draft (proposed).
 * Optionally mirrors into workspace-command DraftMutation for Apply wire.
 */
export function createDraftFromIntent(input: {
  readonly workspaceId: string;
  readonly intent: WorkspaceIntent;
  readonly sourceText?: string;
  readonly mirrorWorkspaceCommand?: boolean;
}): RealityDraft {
  const workspaceId = input.workspaceId.trim();
  const ws = ensureWs(workspaceId);
  const diff = buildDraftDiffFromIntent({
    workspace: ws,
    intent: input.intent,
  });

  let workspaceDraftId: string | null = null;
  if (input.mirrorWorkspaceCommand !== false) {
    const command = createWorkspaceCommand({
      workspaceId,
      rawText: input.sourceText?.trim() || `${input.intent.action} draft`,
    });
    const proposal = proposeDraftAction({
      command,
      intent: input.intent,
    });
    workspaceDraftId = proposal.draft.id;
  }

  return createDraft({
    workspaceId,
    before: diff.before,
    after: diff.after,
    impact: diff.impact,
    sourceText: input.sourceText,
    intent: input.intent,
    workspaceDraftId,
  });
}

export function readDraft(draftId: string): RealityDraft | null {
  return store.get(draftId) ?? null;
}

export function listDrafts(
  workspaceId?: string,
  status?: RealityDraftStatus,
): readonly RealityDraft[] {
  return [...store.values()]
    .filter((d) => (workspaceId ? d.workspaceId === workspaceId : true))
    .filter((d) => (status ? d.status === status : true))
    .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
}

function updateStatus(
  draftId: string,
  status: RealityDraftStatus,
): RealityDraft | null {
  const prev = readDraft(draftId);
  if (!prev) return null;
  const next: RealityDraft = {
    ...prev,
    status,
    updatedAtIso: new Date().toISOString(),
  };
  store.set(draftId, next);
  return next;
}

/**
 * Human Apply — proposed → approved.
 * Workspace Instance may update; Global Reality Store stays read-only.
 */
export function approveDraft(draftId: string): DraftApplyResult {
  const draft = readDraft(draftId);
  if (!draft) {
    return { ok: false, reasonKo: "Draft를 찾을 수 없어요" };
  }
  if (draft.status !== "proposed") {
    return { ok: false, reasonKo: `이미 ${draft.status} 상태예요` };
  }

  if (draft.workspaceDraftId) {
    const applied = applyDraftMutation(draft.workspaceDraftId);
    if (!applied.ok) {
      return {
        ok: false,
        reasonKo: applied.reasonKo,
        forbiddenRealityMutation: applied.forbiddenRealityMutation,
      };
    }
  }

  const approved = updateStatus(draft.id, "approved");
  if (!approved) {
    return { ok: false, reasonKo: "Draft 상태 갱신 실패" };
  }

  return { ok: true, draft: approved, applyLabelKo: "Apply" };
}

/** Reject Draft — proposed → rejected. No Reality change. */
export function rejectDraft(draftId: string): DraftApplyResult {
  const draft = readDraft(draftId);
  if (!draft) {
    return { ok: false, reasonKo: "Draft를 찾을 수 없어요" };
  }
  if (draft.status !== "proposed") {
    return { ok: false, reasonKo: `이미 ${draft.status} 상태예요` };
  }

  if (draft.workspaceDraftId) {
    const rejected = rejectDraftMutation(draft.workspaceDraftId);
    if (!rejected.ok) {
      return { ok: false, reasonKo: rejected.reasonKo };
    }
  }

  const next = updateStatus(draft.id, "rejected");
  if (!next) {
    return { ok: false, reasonKo: "Draft 상태 갱신 실패" };
  }
  return { ok: true, draft: next, applyLabelKo: "Apply" };
}

/** Full UX card including Apply affordance */
export function formatDraftUxCardKo(draft: RealityDraft): string {
  const diff: RealityDraftDiff = {
    before: draft.before,
    after: draft.after,
    impact: draft.impact,
  };
  const body = formatDraftDiffUxKo(diff);
  const apply =
    draft.status === "proposed" ? "\n\n[Apply]" : `\n\nstatus · ${draft.status}`;
  return body + apply;
}

export function clearDraftsForTests(workspaceId?: string): void {
  if (!workspaceId) {
    store.clear();
    return;
  }
  for (const [id, d] of store) {
    if (d.workspaceId === workspaceId) store.delete(id);
  }
}
