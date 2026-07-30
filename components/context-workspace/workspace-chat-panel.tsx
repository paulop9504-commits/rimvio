"use client";

/**
 * Collapsible Workspace chat — transcript + Object Cards + Workspace patch strip.
 * Cards share nodeId with the map — click focuses Workspace (one AI work surface).
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  readWorkspaceChat,
  subscribeWorkspaceChatUpdated,
  type WorkspaceChatObjectCard,
  type WorkspaceChatTurn,
} from "@/lib/context-workspace/workspace-chat-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceChatPanelProps = {
  contextEventId: string;
  open: boolean;
  onToggle: () => void;
  className?: string;
  /** Focus map node from Object Card. */
  onFocusNode?: (nodeId: string) => void;
  /** Expand / scroll to linked Workspace work. */
  onOpenLinkedWork?: () => void;
};

function ObjectCardButton(props: {
  card: WorkspaceChatObjectCard;
  onFocus?: (nodeId: string) => void;
}) {
  return (
    <button
      type="button"
      className="min-w-[7.5rem] flex-1 rounded-[14px] bg-white px-2.5 py-2 text-left shadow-sm ring-1 ring-black/[0.06] transition active:scale-[0.98]"
      onClick={() => props.onFocus?.(props.card.nodeId)}
      data-workspace-chat-object={props.card.nodeId}
    >
      <p className="truncate text-[11px] font-extrabold tracking-tight text-[#191f28]">
        {props.card.kind === "lodging"
          ? "🏨 "
          : props.card.kind === "eatery"
            ? "🍜 "
            : "📍 "}
        {props.card.title}
      </p>
      <p className="mt-0.5 truncate text-[9px] font-medium text-[#8b95a1]">
        {props.card.subtitleKo}
      </p>
      <p className="mt-1.5 text-[10px] font-bold text-[#3182f6]">
        {props.card.ctaKo}
      </p>
    </button>
  );
}

function AssistantBubble(props: {
  turn: WorkspaceChatTurn;
  onFocusNode?: (nodeId: string) => void;
  onOpenLinkedWork?: () => void;
}) {
  const { turn } = props;
  return (
    <div className="max-w-[92%] space-y-1.5">
      <div className="rounded-2xl bg-[#f2f4f6] px-2.5 py-1.5 text-[11px] leading-snug text-[#191f28] whitespace-pre-wrap">
        {turn.text}
      </div>
      {turn.patch?.summaryKo ? (
        <p
          className="rounded-full bg-[#e8f3ff] px-2.5 py-1 text-[9px] font-bold tracking-tight text-[#3182f6]"
          data-workspace-chat-patch
        >
          {turn.patch.summaryKo}
        </p>
      ) : null}
      {turn.objects && turn.objects.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {turn.objects.map((card) => (
            <ObjectCardButton
              key={card.nodeId}
              card={card}
              onFocus={props.onFocusNode}
            />
          ))}
        </div>
      ) : null}
      {turn.showLinkedWorkCta ? (
        <button
          type="button"
          className="text-[10px] font-bold text-[#3182f6]"
          onClick={() => props.onOpenLinkedWork?.()}
          data-workspace-chat-linked-work
        >
          {copy.globe.workspaceChatLinkedWork}
        </button>
      ) : null}
    </div>
  );
}

export function WorkspaceChatPanel({
  contextEventId,
  open,
  onToggle,
  className,
  onFocusNode,
  onOpenLinkedWork,
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
              {copy.globe.workspaceChatTitle}
            </p>
            <p className="text-[9px] text-[#8b95a1]">
              {turns.length > 0
                ? copy.globe.workspaceChatTurnCount(turns.length)
                : copy.globe.workspaceChatEmptyHint}
            </p>
          </div>
          <div
            ref={scrollerRef}
            className="max-h-[min(40vh,320px)] space-y-2.5 overflow-y-auto px-3 py-2"
          >
            {turns.length === 0 ? (
              <p className="py-3 text-center text-[11px] leading-relaxed text-[#8b95a1]">
                {copy.globe.workspaceChatEmptyBody}
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
                  {turn.role === "user" ? (
                    <div className="max-w-[88%] rounded-2xl bg-[#3182f6] px-2.5 py-1.5 text-[11px] leading-snug text-white">
                      {turn.text}
                    </div>
                  ) : (
                    <AssistantBubble
                      turn={turn}
                      onFocusNode={onFocusNode}
                      onOpenLinkedWork={onOpenLinkedWork}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
