"use client";

/**
 * Workspace-local prompt — realtime edits (GPT Maps bottom bar).
 */

import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { tryApplyWorkspacePromptTurn } from "@/lib/context-workspace/try-apply-workspace-lodging-turn";
import {
  readContextWorkspace,
  subscribeContextWorkspaceUpdated,
} from "@/lib/context-workspace/workspace-store";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspacePromptBarProps = {
  contextEventId: string;
  className?: string;
  /** Hide quick chips — shell already has tool pills. */
  compact?: boolean;
};

const QUICK_PROMPTS = [
  { label: "더 싸게", text: "더 싼 곳만" },
  { label: "평점 높은", text: "평점 4.5 이상" },
  { label: "비슷한 곳", text: "비슷한 곳 더 찾아" },
] as const;

export function WorkspacePromptBar({
  contextEventId,
  className,
  compact = false,
}: WorkspacePromptBarProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusKo, setStatusKo] = useState<string | null>(null);

  useEffect(() => {
    const id = contextEventId.trim();
    if (!id) {
      return;
    }
    const syncStatus = () => {
      const state = readContextWorkspace(id);
      if (state?.lastChangeKo) {
        setStatusKo(state.lastChangeKo);
      }
    };
    syncStatus();
    return subscribeContextWorkspaceUpdated((eventId) => {
      if (eventId === id) {
        syncStatus();
      }
    });
  }, [contextEventId]);

  const runTurn = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      const eventId = contextEventId.trim();
      if (!text || !eventId || busy) {
        return;
      }
      setBusy(true);
      try {
        const result = await tryApplyWorkspacePromptTurn({
          utterance: text,
          contextEventId: eventId,
        });
        if (result.handled) {
          const reply =
            result.replyKo ??
            readContextWorkspace(eventId)?.lastChangeKo ??
            "반영했어요";
          setStatusKo(reply);
          toast.message(reply);
          setValue("");
        } else {
          setStatusKo(copy.globe.workspacePromptUnhandled);
          toast.message(copy.globe.workspacePromptUnhandled);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, contextEventId],
  );

  return (
    <div className={cn("w-full space-y-1.5", className)} data-workspace-prompt>
      {!compact && statusKo ? (
        <p className="px-1 text-center text-[11px] font-medium text-[#8b95a1]">
          {statusKo}
        </p>
      ) : null}
      {!compact ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {QUICK_PROMPTS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={busy}
              className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#191f28] shadow-sm ring-1 ring-black/[0.05] disabled:opacity-50"
              onClick={() => void runTurn(chip.text)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="flex items-center gap-2 rounded-[22px] bg-white px-3 py-2 shadow-[0_8px_28px_rgba(25,31,40,0.14)] ring-1 ring-black/[0.05]"
        onSubmit={(event) => {
          event.preventDefault();
          void runTurn(value);
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={copy.globe.workspacePromptPlaceholder}
          disabled={busy}
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-[15px] text-[#191f28] outline-none placeholder:text-[#8b95a1]"
          aria-label={copy.globe.workspacePromptPlaceholder}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ background: GLOBE_TOSS_THEME.blue }}
          aria-label="보내기"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
