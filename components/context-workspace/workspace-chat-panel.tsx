"use client";

/**
 * Collapsible Workspace chat — transcript + Object Cards + Workspace patch strip.
 * Cards share nodeId with the map — click focuses Workspace (one AI work surface).
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  readWorkspaceChat,
  subscribeWorkspaceChatUpdated,
  type WorkspaceChatObjectCard,
  type WorkspaceChatTurn,
} from "@/lib/context-workspace/workspace-chat-store";
import { ContextBriefCard } from "@/components/context-workspace/context-brief-card";
import { RealityDraftItineraryCard } from "@/components/context-workspace/reality-draft-itinerary-card";
import { AssistantEntityRichText } from "@/components/globe/assistant-entity-rich-text";
import {
  dispatchRealityJump,
  type RealityJumpTarget,
} from "@/lib/globe/reality-jump";
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
  /** Brief Replay started — collapse chat / clear peek optional. */
  onBriefReplay?: () => void;
  /** Highlight ground line while replaying. */
  briefReplayGroundIndex?: number | null;
  /** Highlight entity chip when map selection matches. */
  activeDraftNodeId?: string | null;
};

function ObjectCardButton(props: {
  card: WorkspaceChatObjectCard;
  onFocus?: (nodeId: string) => void;
}) {
  return (
    <button
      type="button"
      className="min-w-[7.25rem] flex-1 rounded-[14px] bg-[#f7f8fa] px-2.5 py-2 text-left transition active:scale-[0.98] hover:bg-[#f2f4f6]"
      onClick={() => props.onFocus?.(props.card.nodeId)}
      data-workspace-chat-object={props.card.nodeId}
    >
      <p className="truncate text-[12px] font-semibold tracking-tight text-[#191f28]">
        {props.card.kind === "lodging"
          ? "🏨 "
          : props.card.kind === "eatery"
            ? "🍜 "
            : "📍 "}
        {props.card.title}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-[#8b95a1]">
        {props.card.subtitleKo}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold text-[#3182f6]">
        {props.card.ctaKo}
      </p>
    </button>
  );
}

function AssistantBubble(props: {
  turn: WorkspaceChatTurn;
  contextEventId: string;
  onFocusNode?: (nodeId: string) => void;
  onOpenLinkedWork?: () => void;
  onBriefReplay?: () => void;
  briefReplayGroundIndex?: number | null;
  activeDraftNodeId?: string | null;
}) {
  const { turn, contextEventId } = props;
  const brief = turn.contextBrief ?? null;
  const draft = turn.realityDraft ?? null;
  const onRealityJump = (target: RealityJumpTarget) => {
    const ok = dispatchRealityJump({
      contextEventId,
      target,
      source: "workspace_chat",
    });
    if (ok) {
      toast.message(copy.globe.realityJumpToast(target.labelKo));
    }
  };

  if (draft || brief) {
    return (
      <div className="max-w-[96%] space-y-1.5">
        {draft ? (
          <RealityDraftItineraryCard
            draft={draft}
            onFocusNode={props.onFocusNode}
            activeNodeId={props.activeDraftNodeId}
          />
        ) : null}
        {brief && !draft ? (
          <ContextBriefCard
            brief={brief}
            contextEventId={contextEventId}
            onFocusNode={props.onFocusNode}
            onReplayStart={() => {
              toast.message(copy.globe.contextBriefReplayToast);
              props.onBriefReplay?.();
            }}
            activeGroundIndex={props.briefReplayGroundIndex}
          />
        ) : null}
        {brief && draft ? (
          <button
            type="button"
            className="text-[10px] font-bold text-[#3182f6]"
            onClick={() => {
              toast.message(copy.globe.contextBriefReplayToast);
              props.onBriefReplay?.();
            }}
            data-reality-draft-replay
          >
            {copy.globe.contextBriefReplayCta}
          </button>
        ) : null}
        {turn.patch?.summaryKo ? (
          <p
            className="rounded-full bg-[#f2f4f6] px-2.5 py-1 text-[10px] font-medium tracking-tight text-[#8b95a1]"
            data-workspace-chat-patch
          >
            {turn.patch.summaryKo}
          </p>
        ) : null}
        {turn.showLinkedWorkCta ? (
          <button
            type="button"
            className="px-0.5 text-[11px] font-semibold text-[#3182f6] transition hover:opacity-80"
            onClick={() => props.onOpenLinkedWork?.()}
            data-workspace-chat-linked-work
          >
            {copy.globe.workspaceChatLinkedWork}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-[92%] space-y-1.5">
      <div className="rounded-[18px] rounded-bl-[6px] bg-[#f2f4f6] px-3 py-2 text-[12px] leading-snug tracking-tight text-[#191f28]">
        <AssistantEntityRichText
          text={turn.text}
          onRealityJump={onRealityJump}
        />
      </div>
      {turn.patch?.summaryKo ? (
        <p
          className="rounded-full bg-[#f2f4f6] px-2.5 py-1 text-[10px] font-medium tracking-tight text-[#8b95a1]"
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
          className="px-0.5 text-[11px] font-semibold text-[#3182f6] transition hover:opacity-80"
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
  onBriefReplay,
  briefReplayGroundIndex = null,
  activeDraftNodeId = null,
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
      <div className="mb-2 flex justify-center">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#191f28] shadow-[0_4px_14px_rgba(25,31,40,0.1)] transition active:scale-95"
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
        <div className="overflow-hidden rounded-[22px] bg-white/95 shadow-[0_10px_32px_rgba(25,31,40,0.1)] backdrop-blur-sm">
          <div className="flex items-baseline justify-between px-3.5 pb-1 pt-3">
            <p className="text-[12px] font-semibold tracking-tight text-[#191f28]">
              {copy.globe.workspaceChatTitle}
            </p>
            <p className="text-[10px] font-medium text-[#8b95a1]">
              {turns.length > 0
                ? copy.globe.workspaceChatTurnCount(turns.length)
                : copy.globe.workspaceChatEmptyHint}
            </p>
          </div>
          <div
            ref={scrollerRef}
            className="max-h-[min(42vh,340px)] space-y-3 overflow-y-auto px-3 pb-3 pt-1"
          >
            {turns.length === 0 ? (
              <p className="px-1 py-6 text-center text-[12px] leading-relaxed text-[#8b95a1]">
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
                    <div className="max-w-[88%] rounded-[18px] rounded-br-[6px] bg-[#3182f6] px-3 py-2 text-[12px] font-medium leading-snug tracking-tight text-white shadow-[0_4px_12px_rgba(49,130,246,0.25)]">
                      {turn.text}
                    </div>
                  ) : (
                    <AssistantBubble
                      turn={turn}
                      contextEventId={contextEventId}
                      onFocusNode={onFocusNode}
                      onOpenLinkedWork={onOpenLinkedWork}
                      onBriefReplay={onBriefReplay}
                      briefReplayGroundIndex={briefReplayGroundIndex}
                      activeDraftNodeId={activeDraftNodeId}
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
