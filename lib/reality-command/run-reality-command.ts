/**
 * Natural Language Reality Command Engine
 *
 * Input → Intent Resolver → Action Proposal → Draft
 *
 * Converts user NL into Reality Actions (Draft only).
 * Never commits Globe Reality.
 */

import { createWorkspaceCommand } from "@/lib/workspace-command/command-parser";
import { proposeDraftAction } from "@/lib/workspace-command/draft-action-engine";
import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import { buildRealityActionProposal } from "@/lib/reality-command/action-proposal";
import {
  looksLikeRealityCommitCommand,
  resolveRealityCommandIntent,
} from "@/lib/reality-command/intent-resolver";
import type {
  RealityCommandInput,
  RealityCommandIntent,
  RealityCommandResult,
} from "@/lib/reality-command/types";

/**
 * Map Reality Command Intent → WorkspaceIntent for Draft engine.
 */
export function toWorkspaceIntent(
  intent: RealityCommandIntent,
): WorkspaceIntent {
  switch (intent.action) {
    case "filter":
      return {
        action:
          intent.constraint.type === "capsule" ||
          intent.constraint.hotelType === "capsule"
            ? "modify_context"
            : intent.constraint.near
              ? "add_constraint"
              : "filter",
        target: "hotel",
        parameters: {
          ...intent.constraint,
          hotelType:
            intent.constraint.type === "capsule"
              ? "capsule"
              : intent.constraint.hotelType,
          category:
            intent.constraint.type === "capsule"
              ? "capsule"
              : intent.constraint.category,
        },
      };
    case "replace":
      return {
        action: "replace",
        target: "hotel",
        parameters: { ...intent.constraint },
      };
    case "move":
      return {
        action: "move",
        target: "hotel",
        parameters: { ...intent.constraint },
      };
    case "compare":
      return {
        action: "compare",
        target: "hotel",
        parameters: { ...intent.constraint },
      };
    case "optimize":
      return {
        action: "optimize_context",
        target: "hotel",
        parameters: { ...intent.constraint },
      };
    case "simulate":
      return {
        action: "simulate",
        target: "hotel",
        parameters: {
          simulateScenarioKo: intent.constraint.scenarioKo ?? null,
          ...intent.constraint,
        },
      };
    case "prepare":
      return {
        action: "prepare",
        target: "hotel",
        parameters: { ...intent.constraint },
      };
  }
}

/**
 * Run NL Reality Command → Intent → Action Preview → Draft (proposed).
 */
export function runRealityCommand(
  input: RealityCommandInput,
): RealityCommandResult {
  const text = input.text.trim();
  if (!text) {
    return {
      ok: false,
      input: text,
      reasonKo: "명령이 비어 있어요",
      forbiddenCommit: false,
    };
  }

  if (looksLikeRealityCommitCommand(text)) {
    return {
      ok: false,
      input: text,
      reasonKo:
        "Reality Commit은 Command로 할 수 없어요 · Field에서 확정하세요",
      forbiddenCommit: true,
    };
  }

  const intent = resolveRealityCommandIntent(text);
  if (!intent) {
    return {
      ok: false,
      input: text,
      reasonKo: "Reality Action으로 해석할 수 없어요",
      forbiddenCommit: false,
    };
  }

  const workspaceId = input.workspaceId.trim();
  let draftId: string | null = null;
  let draftStatus: "proposed" | null = null;

  if (workspaceId) {
    const command = createWorkspaceCommand({
      workspaceId,
      rawText: text,
    });
    const wsIntent = toWorkspaceIntent(intent);
    const proposal = proposeDraftAction({
      command,
      intent: wsIntent,
      targetObjectId: input.targetObjectId,
    });
    draftId = proposal.draft.id;
    draftStatus = proposal.draft.status === "proposed" ? "proposed" : null;
  }

  const proposal = buildRealityActionProposal({
    intent,
    draftId,
    draftStatus,
  });

  return {
    ok: true,
    input: text,
    intent,
    proposal,
    summaryKo: [
      `Command · ${text}`,
      `Intent · ${intent.action} · ${intent.target}`,
      proposal.previewKo,
      draftId ? `Draft · ${draftId} · proposed` : "Draft · preview only",
    ].join("\n"),
  };
}

/** Parse-only (no Draft write) — useful for UI chips / tests */
export function parseRealityCommand(text: string): RealityCommandIntent | null {
  return resolveRealityCommandIntent(text);
}
