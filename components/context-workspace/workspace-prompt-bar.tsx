"use client";

/**
 * Workspace prompt — GPT bottom bar; mutates Workspace like Cursor chat.
 */

import { useCallback, useState } from "react";
import { ArrowUp } from "lucide-react";
import { tryApplyWorkspacePromptTurn } from "@/lib/context-workspace/try-apply-workspace-lodging-turn";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { appendWorkspaceChatTurn } from "@/lib/context-workspace/workspace-chat-store";
import { WorkspaceAgentStatusPanel } from "@/components/context-workspace/workspace-agent-status-panel";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import { copy } from "@/lib/copy/human-ko";
import { resolveRimvioCommandPlaceholder } from "@/lib/rimvio-command";
import {
  dispatchExecutionFeedGoal,
  dispatchExecutionFeedStep,
} from "@/lib/context-run/execution-feed-bridge";
import { scheduleExecutionFeedDismiss } from "@/lib/context-run/execution-feed-lifecycle";
import {
  beginAgentExecutionSession,
  completeAgentExecutionStep,
  finishAgentExecutionSession,
  pushAgentExecutionStep,
} from "@/lib/workstream/agent-execution-session";
import { cn } from "@/lib/utils";

export type WorkspacePromptBarProps = {
  contextEventId: string;
  className?: string;
  /** Hide quick chips — shell already has tool pills. */
  compact?: boolean;
  /** Expand chat panel when user sends a turn. */
  onTurn?: () => void;
};

export function WorkspacePromptBar({
  contextEventId,
  className,
  compact = false,
  onTurn,
}: WorkspacePromptBarProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const placeholder = resolveRimvioCommandPlaceholder("workspace");

  const runTurn = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      const eventId = contextEventId.trim();
      if (!text || !eventId || busy) {
        return;
      }
      setBusy(true);
      onTurn?.();
      beginAgentExecutionSession({
        contextEventId: eventId,
        headlineKo: copy.globe.agentBuildingContext,
      });
      pushAgentExecutionStep({
        id: "turn-analyze",
        labelKo: copy.globe.activityAnalyzing,
        status: "running",
        contextEventId: eventId,
      });
      const graphId = `ws-turn-${Date.now()}`;
      dispatchExecutionFeedGoal({ graphId, goalKo: text });
      dispatchExecutionFeedStep({
        graphId,
        stepId: "analyze",
        labelKo: copy.globe.activityAnalyzing,
        status: "running",
      });
      appendWorkspaceChatTurn({
        contextEventId: eventId,
        role: "user",
        text,
      });
      try {
        completeAgentExecutionStep("turn-analyze");
        pushAgentExecutionStep({
          id: "turn-apply",
          labelKo: copy.globe.activityWorkspaceTurn,
          status: "running",
          contextEventId: eventId,
        });
        dispatchExecutionFeedStep({
          graphId,
          stepId: "analyze",
          labelKo: copy.globe.activityAnalyzing,
          status: "done",
        });
        dispatchExecutionFeedStep({
          graphId,
          stepId: "apply",
          labelKo: copy.globe.activityWorkspaceTurn,
          status: "running",
        });
        const result = await tryApplyWorkspacePromptTurn({
          utterance: text,
          contextEventId: eventId,
        });
        completeAgentExecutionStep("turn-apply");
        dispatchExecutionFeedStep({
          graphId,
          stepId: "apply",
          labelKo: copy.globe.activityWorkspaceTurn,
          status: "done",
          resultKo: result.handled ? `✓ ${copy.globe.activityDone}` : undefined,
        });
        const reply = result.handled
          ? (result.replyKo ??
            readContextWorkspace(eventId)?.lastChangeKo ??
            "반영했어요")
          : copy.globe.workspacePromptUnhandled;
        appendWorkspaceChatTurn({
          contextEventId: eventId,
          role: "assistant",
          text: reply,
        });
        setValue("");
      } finally {
        finishAgentExecutionSession({ keepMs: 5_000 });
        setBusy(false);
        scheduleExecutionFeedDismiss("run_complete");
      }
    },
    [busy, contextEventId, onTurn],
  );

  return (
    <div className={cn("w-full", className)} data-workspace-prompt>
      <WorkspaceAgentStatusPanel
        contextEventId={contextEventId}
        busy={busy}
        onContinue={() => void runTurn("계속해")}
      />
      {!compact ? (
        <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {(
            [
              { label: "더 싸게", text: "더 싼 곳만" },
              { label: "평점 높은", text: "평점 4.5 이상" },
              { label: "비슷한 곳", text: "비슷한 곳 더 찾아" },
            ] as const
          ).map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={busy}
              className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#191f28] shadow-sm ring-1 ring-black/[0.05] disabled:opacity-50"
              onClick={() => void runTurn(chip.text)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="flex items-center gap-2 rounded-[22px] bg-white px-3 py-1.5 shadow-[0_8px_28px_rgba(25,31,40,0.14)] ring-1 ring-black/[0.05]"
        onSubmit={(event) => {
          event.preventDefault();
          void runTurn(value);
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          disabled={busy}
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5 text-[13px] text-[#191f28] outline-none placeholder:text-[#8b95a1]"
          aria-label={placeholder}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ background: GLOBE_TOSS_THEME.blue }}
          aria-label="보내기"
        >
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
