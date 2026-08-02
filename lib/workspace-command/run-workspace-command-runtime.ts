/**
 * Workspace Command Runtime — Reality OS Draft path.
 *
 * NL → Intent → Action Proposal → (user Apply) → Workspace State → Projection
 * Does NOT mutate Global Reality on propose.
 */

import {
  applyDraftMutation,
} from "@/lib/workspace-command/apply-draft-mutation";
import { parseWorkspaceCommand } from "@/lib/workspace-command/command-parser";
import { proposeDraftAction } from "@/lib/workspace-command/draft-action-engine";
import {
  looksLikeForbiddenGlobeCommit,
  resolveWorkspaceIntent,
} from "@/lib/workspace-command/intent-resolver";
import type { WorkspaceCommandRuntimeResult } from "@/lib/workspace-command/types";
import { assertActiveWorkspace } from "@/lib/workspace-command/workspace-store";
import { readWorkspace } from "@/lib/workspace/workspace-store";

export function runWorkspaceCommandRuntime(input: {
  readonly workspaceId: string;
  readonly rawText: string;
  readonly targetObjectId?: string | null;
  /**
   * When true, propose then immediately apply (tests / trusted automations).
   * Default false — Preview → [적용] required.
   */
  readonly applyImmediately?: boolean;
}): WorkspaceCommandRuntimeResult {
  const command = parseWorkspaceCommand({
    workspaceId: input.workspaceId,
    rawText: input.rawText,
  });
  if (!command) {
    return {
      ok: false,
      command: null,
      reasonKo: "명령을 읽을 수 없어요",
      inactiveWorkspace: false,
      forbiddenGlobeMutation: false,
    };
  }

  const gate = assertActiveWorkspace(command.workspaceId);
  if (!gate.ok) {
    return {
      ok: false,
      command,
      reasonKo: gate.reasonKo,
      inactiveWorkspace: true,
      forbiddenGlobeMutation: false,
    };
  }

  const intent = resolveWorkspaceIntent(command, {
    targetObjectId: input.targetObjectId,
  });

  if (!intent && looksLikeForbiddenGlobeCommit(command.rawText)) {
    return {
      ok: false,
      command,
      reasonKo:
        "Globe Reality Commit은 Workspace Command로 할 수 없어요 · Field에서 확정하세요",
      inactiveWorkspace: false,
      forbiddenGlobeMutation: true,
    };
  }

  if (!intent) {
    return {
      ok: false,
      command,
      reasonKo: "Workspace에서 다룰 수 있는 명령이 아니에요",
      inactiveWorkspace: false,
      forbiddenGlobeMutation: false,
    };
  }

  // Reality OS: propose Draft Action (no immediate Reality / optional no immediate WS apply)
  const proposal = proposeDraftAction({
    command,
    intent,
    targetObjectId: input.targetObjectId,
  });

  if (input.applyImmediately) {
    const applied = applyDraftMutation(proposal.draft.id);
    if (!applied.ok) {
      return {
        ok: false,
        command,
        reasonKo: applied.reasonKo,
        inactiveWorkspace: false,
        forbiddenGlobeMutation: Boolean(applied.forbiddenRealityMutation),
      };
    }
    const ws = readWorkspace(command.workspaceId);
    return {
      ok: true,
      command,
      intent,
      mutation: {
        workspaceId: command.workspaceId,
        targetObjectId: proposal.draft.targetObjectId,
        mutationType: "draft_applied",
        changes: proposal.draft.afterState,
      },
      summaryKo: applied.summaryKo,
      draftVersion: ws?.revision ?? 0,
      proposal: null,
      mode: "applied",
    };
  }

  const ws = readWorkspace(command.workspaceId);
  return {
    ok: true,
    command,
    intent,
    mutation: null,
    summaryKo: proposal.previewKo,
    draftVersion: ws?.revision ?? 0,
    proposal,
    mode: "proposed",
  };
}
