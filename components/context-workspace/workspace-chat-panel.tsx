"use client";

/**
 * Collapsible Workspace chat — GPT/Cursor transcript above the prompt.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  readWorkspaceChat,
  subscribeWorkspaceChatUpdated,
  type WorkspaceChatTurn,
} from "@/lib/context-workspace/workspace-chat-store";
import { cn } from "@/lib/utils";

export type WorkspaceChatPanelProps = {
  contextEventId: string;
  open: boolean;
  onToggle: () => void;
  className?: string;
};

export function WorkspaceChatPanel({
  contextEventId,
  open,
  onToggle,
  className,
}: WorkspaceChatPanelProps) {
  const [turns, setTurns] = useState<readonly WorkspaceChatTurn[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = contextEventId.trim();
    if (!id) {
      return;
    }
    const sync = () => setTurns(readWorkspaceChat(id));
    sync();
    return subscribeWorkspaceChatUpdated((eventId) => {
      if (eventId === id) {
        sync();
      }
    });
  }, [contextEventId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const el = scrollerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [turns, open]);

  return (
    <div
      className={cn("pointer-events-auto mx-auto w-full max-w-xl", className)}
      data-workspace-chat
    >
      <div className="mb-1.5 flex justify-center">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#191f28] shadow-[0_2px_10px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "대화 접기" : "대화 펼치기"}
        >
          {open ? (
            <ChevronDown className="h-4 w-4" strokeWidth={2.25} />
          ) : (
            <ChevronUp className="h-4 w-4" strokeWidth={2.25} />
          )}
        </button>
      </div>

      {open ? (
        <div className="overflow-hidden rounded-[18px] bg-white/95 shadow-[0_8px_28px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]">
          <div className="flex items-center justify-between border-b border-black/[0.04] px-3 py-1.5">
            <p className="text-[10px] font-bold tracking-tight text-[#191f28]">
              작업장 대화
            </p>
            <p className="text-[9px] text-[#8b95a1]">
              {turns.length > 0 ? `${turns.length}턴` : "말로 편집"}
            </p>
          </div>
          <div
            ref={scrollerRef}
            className="max-h-[min(32vh,240px)] space-y-2 overflow-y-auto px-3 py-2"
          >
            {turns.length === 0 ? (
              <p className="py-3 text-center text-[11px] leading-relaxed text-[#8b95a1]">
                맛집 · 놀거리 · 고정 · 비교…
                <br />
                말하면 지도가 바로 바뀌어요
              </p>
            ) : (
              turns.map((turn) => (
                <div
                  key={turn.id}
                  className={cn(
                    "flex",
                    turn.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-2.5 py-1.5 text-[11px] leading-snug",
                      turn.role === "user"
                        ? "bg-[#3182f6] text-white"
                        : "bg-[#f2f4f6] text-[#191f28]",
                    )}
                  >
                    {turn.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
