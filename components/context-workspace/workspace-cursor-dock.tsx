"use client";

/**
 * Cursor-like Workspace dock — Agent strip + chat + prompt in one panel.
 * Map stays primary; dock is a compact composer (not two stacked full cards).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  appendWorkspaceChatTurn,
  readWorkspaceChat,
  subscribeWorkspaceChatUpdated,
  type WorkspaceChatTurn,
} from "@/lib/context-workspace/workspace-chat-store";
import { tryApplyWorkspacePromptTurn } from "@/lib/context-workspace/try-apply-workspace-lodging-turn";
import {
  readContextWorkspace,
  subscribeContextWorkspaceUpdated,
} from "@/lib/context-workspace/workspace-store";
import { appendWorkspaceSyncedAssistantTurn } from "@/lib/context-workspace/build-workspace-chat-sync";
import { openWorkspaceForTripPrep } from "@/lib/agent/open-workspace-for-trip-prep";
import { shouldPrepareTripWorkspaceDraft } from "@/lib/context-workspace/prepare-trip-workspace-draft";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readWorkstream } from "@/lib/workstream/workstream-store";
import {
  AGENT_EXECUTION_STATUS_LABEL_KO,
  buildAgentExecutionState,
  type AgentExecutionState,
} from "@/lib/workstream/build-agent-execution-state";
import {
  beginAgentExecutionSession,
  completeAgentExecutionStep,
  finishAgentExecutionSession,
  pushAgentExecutionStep,
  readAgentExecutionSession,
  subscribeAgentExecutionSession,
} from "@/lib/workstream/agent-execution-session";
import { spineIngressFromLegacy } from "@/lib/workstream/spine-ingress-helpers";
import {
  dispatchExecutionFeedGoal,
  dispatchExecutionFeedStep,
} from "@/lib/context-run/execution-feed-bridge";
import { scheduleExecutionFeedDismiss } from "@/lib/context-run/execution-feed-lifecycle";
import { RealityDraftItineraryCard } from "@/components/context-workspace/reality-draft-itinerary-card";
import { ContextBriefCard } from "@/components/context-workspace/context-brief-card";
import { AssistantEntityRichText } from "@/components/globe/assistant-entity-rich-text";
import {
  dispatchRealityJump,
  type RealityJumpTarget,
} from "@/lib/globe/reality-jump";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import { resolveRimvioCommandPlaceholder } from "@/lib/rimvio-command";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceCursorDockProps = {
  contextEventId: string;
  onFocusNode?: (nodeId: string) => void;
  onBriefReplay?: () => void;
  briefReplayGroundIndex?: number | null;
  activeDraftNodeId?: string | null;
  className?: string;
};

function AssistantBubble(props: {
  turn: WorkspaceChatTurn;
  contextEventId: string;
  onFocusNode?: (nodeId: string) => void;
  onBriefReplay?: () => void;
  briefReplayGroundIndex?: number | null;
  activeDraftNodeId?: string | null;
}) {
  const { turn, contextEventId } = props;
  const onRealityJump = (target: RealityJumpTarget) => {
    const ok = dispatchRealityJump({
      contextEventId,
      target,
      source: "workspace_chat",
    });
    if (ok) toast.message(copy.globe.realityJumpToast(target.labelKo));
  };

  const draft = turn.realityDraft ?? null;
  const brief = turn.contextBrief ?? null;

  return (
    <div className="max-w-[96%] space-y-1.5">
      {draft ? (
        <RealityDraftItineraryCard
          draft={draft}
          onFocusNode={props.onFocusNode}
          activeNodeId={props.activeDraftNodeId}
          className="shadow-none ring-1 ring-black/[0.04]"
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
          className="shadow-none"
        />
      ) : null}
      {turn.text.trim() ? (
        <div className="rounded-[16px] rounded-bl-[6px] bg-[#f2f4f6] px-2.5 py-1.5 text-[12px] leading-snug text-[#191f28]">
          <AssistantEntityRichText
            text={turn.text}
            onRealityJump={onRealityJump}
          />
        </div>
      ) : null}
      {turn.objects && turn.objects.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto">
          {turn.objects.slice(0, 4).map((card) => (
            <button
              key={card.nodeId}
              type="button"
              className="min-w-[6.5rem] shrink-0 rounded-xl bg-white px-2 py-1.5 text-left ring-1 ring-black/[0.04]"
              onClick={() => props.onFocusNode?.(card.nodeId)}
            >
              <p className="truncate text-[11px] font-semibold">{card.title}</p>
              <p className="truncate text-[9px] text-[#8b95a1]">
                {card.subtitleKo}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceCursorDock({
  contextEventId,
  onFocusNode,
  onBriefReplay,
  briefReplayGroundIndex = null,
  activeDraftNodeId = null,
  className,
}: WorkspaceCursorDockProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [agentExpanded, setAgentExpanded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [turns, setTurns] = useState<readonly WorkspaceChatTurn[]>([]);
  const [agent, setAgent] = useState<AgentExecutionState | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const placeholder = resolveRimvioCommandPlaceholder("workspace");
  const eventId = contextEventId.trim();

  useEffect(() => {
    if (!eventId) return;
    const syncChat = () => setTurns(readWorkspaceChat(eventId));
    syncChat();
    return subscribeWorkspaceChatUpdated((id) => {
      if (id === eventId) syncChat();
    });
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setAgent(null);
      return;
    }
    const refresh = () => {
      const event = findLifeEventCandidate(eventId);
      const workstream = readWorkstream(eventId);
      const session = readAgentExecutionSession();
      setAgent(
        buildAgentExecutionState({
          contextEventId: eventId,
          event,
          workstream,
          session: session?.contextEventId === eventId ? session : null,
        }),
      );
    };
    refresh();
    const unsubWs = subscribeContextWorkspaceUpdated((id) => {
      if (id === eventId) refresh();
    });
    const unsubSession = subscribeAgentExecutionSession(() => refresh());
    return () => {
      unsubWs();
      unsubSession();
    };
  }, [eventId]);

  useEffect(() => {
    if (!transcriptOpen) return;
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, transcriptOpen]);

  const runTurn = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !eventId || busy) return;
      setBusy(true);
      setTranscriptOpen(true);
      spineIngressFromLegacy({
        source: "workstream",
        contextEventId: eventId,
        utterance: text,
        stage: "goal_state",
      });
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

        if (shouldPrepareTripWorkspaceDraft(text)) {
          openWorkspaceForTripPrep({
            utterance: text,
            contextEventId: eventId,
            skipUserChat: true,
          });
          completeAgentExecutionStep("turn-apply");
          dispatchExecutionFeedStep({
            graphId,
            stepId: "apply",
            labelKo: copy.globe.activityWorkspaceTurn,
            status: "done",
            resultKo: `✓ ${copy.globe.activityDone}`,
          });
          setValue("");
          return;
        }

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
        const ws = readContextWorkspace(eventId);
        if (result.handled && ws && ws.nodes.some((n) => n.visible)) {
          appendWorkspaceSyncedAssistantTurn({
            contextEventId: eventId,
            state: ws,
            textKo:
              result.replyKo ??
              ws.lastChangeKo ??
              "Workspace에 반영했어요.",
          });
        } else {
          appendWorkspaceChatTurn({
            contextEventId: eventId,
            role: "assistant",
            text: result.handled
              ? (result.replyKo ?? ws?.lastChangeKo ?? "반영했어요")
              : copy.globe.workspacePromptUnhandled,
          });
        }
        setValue("");
      } finally {
        finishAgentExecutionSession({ keepMs: 4_000 });
        setBusy(false);
        scheduleExecutionFeedDismiss("run_complete");
      }
    },
    [busy, eventId],
  );

  const percent = agent?.percent ?? 0;
  const statusLabel = agent
    ? AGENT_EXECUTION_STATUS_LABEL_KO[agent.status]
    : "대기";
  const taskLine =
    agent?.liveHeadlineKo ||
    agent?.currentTaskKo ||
    copy.globe.workspaceChatEmptyHint;
  const nextLabel = agent?.nextSteps[0]?.labelKo ?? null;

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-[min(96vw,400px)]",
        className,
      )}
      data-workspace-cursor-dock
    >
      <div className="overflow-hidden rounded-[20px] bg-white/96 shadow-[0_12px_36px_rgba(25,31,40,0.16)] ring-1 ring-black/[0.06] backdrop-blur-md">
        <button
          type="button"
          className="flex w-full items-center gap-2 border-b border-black/[0.04] px-3 py-2 text-left"
          onClick={() => setAgentExpanded((v) => !v)}
          aria-expanded={agentExpanded}
        >
          <span className="text-[10px] font-bold tracking-wide text-[#3182f6]">
            Agent
          </span>
          <span className="tabular-nums text-[11px] font-extrabold text-[#191f28]">
            {percent}%
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#8b95a1]">
            {statusLabel} · {taskLine}
          </span>
          {agentExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#8b95a1]" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#8b95a1]" />
          )}
        </button>

        {agentExpanded && agent ? (
          <div className="space-y-1 border-b border-black/[0.04] px-3 py-2 text-[11px] leading-snug text-[#4e5968]">
            <p className="font-semibold text-[#191f28]">{agent.goalKo}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
              <div
                className="h-full rounded-full bg-[#3182f6] transition-[width]"
                style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
              />
            </div>
            {agent.completedSteps.length > 0 ? (
              <p className="text-[#8b95a1]">
                ✓{" "}
                {agent.completedSteps
                  .slice(-2)
                  .map((s) => s.labelKo)
                  .join(" · ")}
              </p>
            ) : null}
            {nextLabel ? (
              <p className="text-[#3182f6]">다음 · {nextLabel}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between px-3 pt-2">
          <p className="text-[11px] font-semibold text-[#191f28]">
            {copy.globe.workspaceChatTitle}
          </p>
          <button
            type="button"
            className="text-[10px] font-medium text-[#8b95a1]"
            onClick={() => setTranscriptOpen((v) => !v)}
          >
            {transcriptOpen ? "접기" : `대화 ${turns.length}`}
          </button>
        </div>

        {transcriptOpen ? (
          <div
            ref={scrollerRef}
            className="max-h-[min(26vh,200px)] space-y-2 overflow-y-auto px-3 py-2"
          >
            {turns.length === 0 ? (
              <p className="py-3 text-center text-[11px] text-[#8b95a1]">
                {copy.globe.workspaceChatEmptyBody}
              </p>
            ) : (
              turns.slice(-10).map((turn) => (
                <div
                  key={turn.id}
                  className={cn(
                    "flex",
                    turn.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {turn.role === "user" ? (
                    <div className="max-w-[88%] rounded-[16px] rounded-br-[6px] bg-[#3182f6] px-2.5 py-1.5 text-[12px] font-medium text-white">
                      {turn.text}
                    </div>
                  ) : (
                    <AssistantBubble
                      turn={turn}
                      contextEventId={eventId}
                      onFocusNode={onFocusNode}
                      onBriefReplay={onBriefReplay}
                      briefReplayGroundIndex={briefReplayGroundIndex}
                      activeDraftNodeId={activeDraftNodeId}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        ) : null}

        <div className="space-y-1.5 border-t border-black/[0.04] px-2.5 py-2">
          {nextLabel ? (
            <button
              type="button"
              disabled={busy}
              className="w-full rounded-xl bg-[#3182f6] px-3 py-2 text-[12px] font-extrabold text-white shadow-[0_4px_14px_rgba(49,130,246,0.3)] disabled:opacity-50"
              onClick={() => void runTurn("계속해")}
            >
              {copy.globe.workspaceWorkContinue}
              <span className="ml-1 font-semibold opacity-90">· {nextLabel}</span>
            </button>
          ) : null}
          <form
            className="flex items-center gap-1.5 rounded-[18px] bg-[#f7f8fa] px-2.5 py-1 ring-1 ring-black/[0.04]"
            onSubmit={(e) => {
              e.preventDefault();
              void runTurn(value);
            }}
          >
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
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
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
