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
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import type { NetworkAbsorbSoftChip } from "@/lib/reality-provider";
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
  /** Peek open — collapse transcript so nothing clips. */
  compact?: boolean;
  /**
   * GPT Maps place sheet — prompt only, no Agent/chat chrome.
   * Renders flush inside the place bottom sheet.
   */
  embedded?: boolean;
  onFocusNode?: (nodeId: string) => void;
  onBriefReplay?: () => void;
  briefReplayGroundIndex?: number | null;
  activeDraftNodeId?: string | null;
  className?: string;
};

function AssistantBubble(props: {
  turn: WorkspaceChatTurn;
  contextEventId: string;
  /** Dock mode — text + chips only; map stays primary (no tall draft cards). */
  dense?: boolean;
  onFocusNode?: (nodeId: string) => void;
  onBriefReplay?: () => void;
  briefReplayGroundIndex?: number | null;
  activeDraftNodeId?: string | null;
}) {
  const { turn, contextEventId, dense = false } = props;
  const onRealityJump = (target: RealityJumpTarget) => {
    const ok = dispatchRealityJump({
      contextEventId,
      target,
      source: "workspace_chat",
    });
    if (ok) toast.message(copy.globe.realityJumpToast(target.labelKo));
  };

  const draft = !dense ? (turn.realityDraft ?? null) : null;
  const brief = !dense ? (turn.contextBrief ?? null) : null;

  return (
    <div className={cn("space-y-1.5", dense ? "max-w-[92%]" : "max-w-[96%]")}>
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
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {turn.objects.slice(0, dense ? 3 : 4).map((card) => (
            <button
              key={card.nodeId}
              type="button"
              className="min-w-[8.75rem] max-w-[10rem] shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-left ring-1 ring-black/[0.04]"
              onClick={() => props.onFocusNode?.(card.nodeId)}
            >
              <p className="line-clamp-2 text-[11px] font-semibold leading-snug">
                {card.title}
              </p>
              <p className="mt-0.5 truncate text-[9px] text-[#8b95a1]">
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
  compact = false,
  embedded = false,
  onFocusNode,
  onBriefReplay,
  briefReplayGroundIndex = null,
  activeDraftNodeId = null,
  className,
}: WorkspaceCursorDockProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [agentExpanded, setAgentExpanded] = useState(false);
  /** Map-first: transcript stays closed until user opens or sends. */
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [turns, setTurns] = useState<readonly WorkspaceChatTurn[]>([]);
  const [agent, setAgent] = useState<AgentExecutionState | null>(null);
  const [softChips, setSoftChips] = useState<readonly NetworkAbsorbSoftChip[]>(
    [],
  );
  const autoContinueRef = useRef<string | null>(null);
  const autoContinueCountRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeholder = resolveRimvioCommandPlaceholder("workspace");
  const eventId = contextEventId.trim();

  useEffect(() => {
    if (compact) {
      setTranscriptOpen(false);
      setAgentExpanded(false);
    }
  }, [compact]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const scheduleTranscriptCollapse = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setTranscriptOpen(false);
      setAgentExpanded(false);
      collapseTimerRef.current = null;
    }, 5_500);
  }, []);
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
    if (!transcriptOpen && !busy) return;
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, transcriptOpen, busy, agent?.percent, agent?.completedSteps.length]);

  const runTurn = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !eventId || busy) return;
      setBusy(true);
      setTranscriptOpen(true);
      setAgentExpanded(false);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
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

        // Cursor Agent Loop: Patch → Projection → Wait (never essay SSOT).
        const result = await applyGlobeWorkspaceAgentTurn({
          utterance: text,
          explicitContextEventId: eventId,
        });
        setSoftChips(result.softChips ?? []);
        completeAgentExecutionStep("turn-apply");
        dispatchExecutionFeedStep({
          graphId,
          stepId: "apply",
          labelKo: copy.globe.activityWorkspaceTurn,
          status: "done",
          resultKo: result.handled ? `✓ ${copy.globe.activityDone}` : undefined,
        });
        const ws = readContextWorkspace(eventId);
        const statusKo =
          result.statusKo?.trim() ||
          ws?.lastChangeKo?.trim() ||
          null;
        if (result.handled && ws && ws.nodes.some((n) => n.visible)) {
          appendWorkspaceSyncedAssistantTurn({
            contextEventId: eventId,
            state: ws,
            textKo: statusKo ?? "Workspace에 반영했어요.",
          });
        } else {
          appendWorkspaceChatTurn({
            contextEventId: eventId,
            role: "assistant",
            text: result.handled
              ? (statusKo ?? "반영했어요")
              : copy.globe.workspacePromptUnhandled,
          });
        }
        setValue("");
      } finally {
        finishAgentExecutionSession({ keepMs: 4_000 });
        setBusy(false);
        setAgentExpanded(false);
        scheduleExecutionFeedDismiss("run_complete");
        scheduleTranscriptCollapse();
      }
    },
    [busy, eventId, scheduleTranscriptCollapse],
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

  // Cursor-like: auto-run next soft step once — no tap wall.
  useEffect(() => {
    if (!eventId || busy || !nextLabel) return;
    if (autoContinueCountRef.current >= 1) return;
    const key = `${eventId}:${nextLabel}`;
    if (autoContinueRef.current === key) return;
    autoContinueRef.current = key;
    autoContinueCountRef.current += 1;
    const timer = window.setTimeout(() => {
      void runTurn("계속해");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [busy, eventId, nextLabel, runTurn]);

  useEffect(() => {
    autoContinueCountRef.current = 0;
    autoContinueRef.current = null;
  }, [eventId]);

  return (
    <div
      className={cn(
        "pointer-events-auto w-full shrink-0",
        !embedded && "mx-auto max-w-[min(96vw,400px)]",
        className,
      )}
      data-workspace-cursor-dock
      data-compact={compact ? "true" : "false"}
      data-embedded={embedded ? "true" : "false"}
    >
      {embedded ? (
        <form
          className="flex items-center gap-1.5 rounded-full bg-[#f2f4f6] px-3 py-1.5"
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
            className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-[14px] text-[#191f28] outline-none placeholder:text-[#8b95a1]"
            aria-label={placeholder}
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
      ) : compact ? (
        <div
          className="overflow-hidden rounded-[22px] bg-white/96 shadow-[0_8px_28px_rgba(25,31,40,0.14)] ring-1 ring-black/[0.06]"
          data-workspace-cursor-dock-compact
        >
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <span className="text-[10px] font-bold tracking-wide text-[#3182f6]">
              Agent
            </span>
            <span className="tabular-nums text-[11px] font-extrabold text-[#191f28]">
              {percent}%
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#8b95a1]">
              {statusLabel} · {taskLine}
            </span>
          </div>
          <form
            className="flex items-center gap-1.5 px-2.5 pb-2"
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
              className="min-w-0 flex-1 rounded-[16px] border-0 bg-[#f7f8fa] px-3 py-2 text-[13px] text-[#191f28] outline-none ring-1 ring-black/[0.04] placeholder:text-[#8b95a1]"
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
      ) : (
      <div
        className={cn(
          "flex max-h-[min(42dvh,320px)] flex-col overflow-hidden bg-white ring-1 ring-black/[0.06]",
          "rounded-[20px] shadow-[0_8px_28px_rgba(25,31,40,0.12)]",
        )}
        data-workspace-work-stream
      >
        {/* One stream chrome — Agent % + open/collapse (no nested Agent panel). */}
        <button
          type="button"
          className="flex w-full shrink-0 items-center gap-2 border-b border-black/[0.04] px-3 py-2 text-left"
          onClick={() => {
            if (collapseTimerRef.current) {
              clearTimeout(collapseTimerRef.current);
              collapseTimerRef.current = null;
            }
            setTranscriptOpen((v) => !v);
            if (transcriptOpen) setAgentExpanded(false);
          }}
          aria-expanded={transcriptOpen || busy}
        >
          <span className="text-[10px] font-bold tracking-wide text-[#3182f6]">
            Agent
          </span>
          {busy || percent > 0 ? (
            <span className="tabular-nums text-[11px] font-extrabold text-[#191f28]">
              {percent}%
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#8b95a1]">
            {busy
              ? `${statusLabel} · ${taskLine}`
              : copy.globe.workspaceChatTitle}
          </span>
          <span className="shrink-0 text-[10px] font-medium text-[#8b95a1]">
            {transcriptOpen || busy
              ? copy.globe.workspaceWorkStreamCollapse
              : copy.globe.workspaceWorkStreamExpand(turns.length)}
          </span>
          {transcriptOpen || busy ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#8b95a1]" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#8b95a1]" />
          )}
        </button>

        {/* Single scroll: live steps → collapse chip → final turns/artifacts */}
        {(transcriptOpen || busy) && (
          <div
            ref={scrollerRef}
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-1.5"
          >
            {busy && agent ? (
              <div className="space-y-1 rounded-xl bg-[#f7f8fa] px-2.5 py-2 text-[11px] leading-snug text-[#4e5968]">
                <p className="font-semibold text-[#191f28]">{agent.goalKo}</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
                  <div
                    className="h-full rounded-full bg-[#3182f6] transition-[width]"
                    style={{
                      width: `${Math.max(2, Math.min(100, percent))}%`,
                    }}
                  />
                </div>
                {agent.completedSteps.map((s) => (
                  <p key={s.id} className="text-[#8b95a1]">
                    ✓ {s.labelKo}
                  </p>
                ))}
                {nextLabel ? (
                  <p className="animate-pulse font-medium text-[#3182f6]">
                    · {nextLabel}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!busy && agent && agent.completedSteps.length > 0 ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg bg-[#eef1f4] px-2.5 py-1.5 text-left"
                onClick={() => setAgentExpanded((v) => !v)}
                aria-expanded={agentExpanded}
                data-agent-step-collapse
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dfe3e8] text-[9px] font-bold text-[#4e5968]"
                  aria-hidden
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#4e5968]">
                  {agent.completedSteps
                    .slice(-2)
                    .map((s) => s.labelKo)
                    .join(" · ")}
                </span>
                {agentExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-[#b0b8c1]" />
                ) : (
                  <ChevronUp className="h-3 w-3 shrink-0 text-[#b0b8c1]" />
                )}
              </button>
            ) : null}

            {!busy && agentExpanded && agent ? (
              <div className="space-y-1 px-0.5 text-[11px] text-[#8b95a1]">
                {agent.completedSteps.map((s) => (
                  <p key={`d-${s.id}`}>✓ {s.labelKo}</p>
                ))}
              </div>
            ) : null}

            {turns.length === 0 && !busy ? (
              <p className="py-2 text-center text-[11px] text-[#8b95a1]">
                {copy.globe.workspaceChatEmptyBody}
              </p>
            ) : (
              turns.slice(-4).map((turn) => (
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
                      dense
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
        )}

        <div className="shrink-0 space-y-1.5 border-t border-black/[0.04] px-2.5 py-2">
          {nextLabel && busy ? (
            <p className="px-1 pb-0.5 text-center text-[11px] font-semibold text-[#3182f6]">
              {copy.globe.workspaceAgentAutoSetting}
              <span className="ml-1 font-medium text-[#8b95a1]">
                · {nextLabel}
              </span>
            </p>
          ) : null}
          {softChips.length > 0 ? (
            <div
              className="flex flex-wrap gap-1.5 px-0.5"
              data-network-absorb-soft-chips
            >
              {softChips.map((chip) => (
                <button
                  key={chip.utterance}
                  type="button"
                  disabled={busy}
                  onClick={() => void runTurn(chip.utterance)}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#4e5968] ring-1 ring-black/[0.06] disabled:opacity-40"
                >
                  {chip.labelKo}
                </button>
              ))}
            </div>
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
      )}
    </div>
  );
}
