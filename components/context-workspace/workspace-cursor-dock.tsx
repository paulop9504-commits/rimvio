"use client";

/**
 * Cursor-like Workspace dock — Agent strip + chat + prompt in one panel.
 * Map stays primary; dock is a compact composer (not two stacked full cards).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  appendWorkspaceChatTurn,
  readWorkspaceChat,
  subscribeWorkspaceChatUpdated,
  type WorkspaceChatTurn,
} from "@/lib/context-workspace/workspace-chat-store";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { prepareWorkspaceImageAgentTurn } from "@/lib/context-run/build-workspace-image-agent-utterance";
import { resolveWorkspaceJobBoundary } from "@/lib/agent-policy/resolve-workspace-job-boundary";
import { bumpSoftNextWorkGeneration } from "@/lib/workstream/offer-soft-next-work-after-act";
import type { NetworkAbsorbSoftChip } from "@/lib/reality-provider";
import { ANCHOR_RETYPE_CHIP_UTTERANCE } from "@/lib/context-workspace/reality-anchor";
import {
  readContextWorkspace,
  subscribeContextWorkspaceUpdated,
} from "@/lib/context-workspace/workspace-store";
import { appendWorkspaceSyncedAssistantTurn } from "@/lib/context-workspace/build-workspace-chat-sync";
import { tryDispatchWorkspaceFactQueryTurn } from "@/lib/context-workspace/dispatch-workspace-fact-query-turn";
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
import {
  agentPlanPercent,
  formatAgentPlanProgressKo,
} from "@/lib/context-run/format-agent-plan-progress";
import { RealityDraftItineraryCard } from "@/components/context-workspace/reality-draft-itinerary-card";
import { ContextBriefCard } from "@/components/context-workspace/context-brief-card";
import { WorkspaceFactAnswerCard } from "@/components/context-workspace/workspace-fact-answer-card";
import { AssistantEntityRichText } from "@/components/globe/assistant-entity-rich-text";
import { AgentExecutionFeed } from "@/components/globe/chat/agent-execution-feed";
import {
  dispatchRealityJump,
  type RealityJumpTarget,
} from "@/lib/globe/reality-jump";
import {
  readAgentActivityTranscript,
  subscribeAgentActivityTranscript,
  type AgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { buildAgentExecutionFeedView } from "@/lib/ui/build-agent-execution-feed";
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
  const fact = turn.factAnswer ?? null;

  if (fact) {
    return (
      <div className={cn("space-y-1.5", dense ? "max-w-[92%]" : "max-w-[96%]")}>
        {turn.text.trim() ? (
          <div className="rounded-[16px] rounded-bl-[6px] bg-[#f2f4f6] px-2.5 py-1.5 text-[12px] leading-snug text-[#191f28]">
            {turn.text}
          </div>
        ) : null}
        <WorkspaceFactAnswerCard wire={fact} />
      </div>
    );
  }

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
        <div className="flex flex-wrap gap-1.5">
          {turn.objects.slice(0, dense ? 4 : 6).map((card) => (
            <button
              key={card.nodeId}
              type="button"
              className="max-w-[11rem] rounded-full bg-white/90 px-2.5 py-1 text-left ring-1 ring-black/[0.06] transition hover:bg-[#f2f4f6] active:scale-[0.98]"
              onClick={() => props.onFocusNode?.(card.nodeId)}
            >
              <p className="truncate text-[11px] font-semibold leading-snug text-[#191f28]">
                {card.title}
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
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  /** Near-full height Agent sheet (top of screen). */
  const [dockTall, setDockTall] = useState(false);
  const [turns, setTurns] = useState<readonly WorkspaceChatTurn[]>([]);
  const [agent, setAgent] = useState<AgentExecutionState | null>(null);
  const [activity, setActivity] = useState<AgentActivityTranscript | null>(
    null,
  );
  const [softChips, setSoftChips] = useState<readonly NetworkAbsorbSoftChip[]>(
    [],
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const placeholder = resolveRimvioCommandPlaceholder("workspace");
  const eventId = contextEventId.trim();

  useEffect(() => {
    if (compact) {
      setTranscriptOpen(false);
      setAgentExpanded(false);
      setDockTall(false);
    }
  }, [compact]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const scheduleTranscriptCollapse = useCallback(() => {
    if (dockTall) return;
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setTranscriptOpen(false);
      setAgentExpanded(false);
      setDockTall(false);
      collapseTimerRef.current = null;
    }, 8_000);
  }, [dockTall]);
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
    if (!eventId) {
      setActivity(null);
      return;
    }
    const refresh = () => {
      const tape = readAgentActivityTranscript();
      setActivity(tape?.contextEventId === eventId ? tape : null);
    };
    refresh();
    return subscribeAgentActivityTranscript(refresh);
  }, [eventId]);

  useEffect(() => {
    if (!transcriptOpen && !busy && !(activity?.running)) return;
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [
    turns,
    transcriptOpen,
    busy,
    activity?.running,
    activity?.events.length,
    agent?.percent,
    agent?.completedSteps.length,
  ]);

  const runTurn = useCallback(
    async (
      raw: string,
      opts?: {
        readonly chatUserText?: string | null;
        readonly statusOverrideKo?: string | null;
      },
    ) => {
      const text = raw.trim();
      if (!text || !eventId || busy) return;
      const chatUserText = opts?.chatUserText?.trim() || text;

      const wsForJob = readContextWorkspace(eventId);
      const jobBoundary = resolveWorkspaceJobBoundary({
        utterance: text,
        hasVisibleCandidates: Boolean(
          wsForJob?.nodes.some((n) => n.visible),
        ),
        previousJob: wsForJob?.agentJob ?? null,
      });
      // Job B / interrupt — kill soft-next from Job A (Continue is human-only).
      if (!jobBoundary.isContinueCue && jobBoundary.abortSoftContinue) {
        bumpSoftNextWorkGeneration(eventId);
      }

      setBusy(true);
      setTranscriptOpen(true);
      setDockTall(true);
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
      dispatchExecutionFeedGoal({ graphId, goalKo: chatUserText });
      dispatchExecutionFeedStep({
        graphId,
        stepId: "analyze",
        labelKo: copy.globe.activityAnalyzing,
        status: "running",
      });
      appendWorkspaceChatTurn({
        contextEventId: eventId,
        role: "user",
        text: chatUserText,
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

        if (await tryDispatchWorkspaceFactQueryTurn({ contextEventId: eventId, text })) {
          completeAgentExecutionStep("turn-apply");
          dispatchExecutionFeedStep({
            graphId,
            stepId: "apply",
            labelKo: copy.globe.activityWorkspaceTurn,
            status: "done",
            resultKo: "✓ Fact",
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
          opts?.statusOverrideKo?.trim() ||
          result.statusKo?.trim() ||
          ws?.lastChangeKo?.trim() ||
          null;
        // Map overlay / soft absorb — answer is the status line (or map), not
        // previous lodging Object Cards synced into chat.
        const isMapOverlay =
          result.patchKind === "map_overlay" ||
          (result.softChips != null && result.softChips.length > 0);
        const isFreeTalk =
          result.via === "free_talk" || result.patchKind === "free_talk";
        if (isMapOverlay || isFreeTalk) {
          appendWorkspaceChatTurn({
            contextEventId: eventId,
            role: "assistant",
            text: statusKo ?? (isFreeTalk ? "네, 편하게 말해줘요 🙂" : "지도에 반영했어요"),
          });
        } else if (result.handled && ws && ws.nodes.some((n) => n.visible)) {
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

  const plan = eventId
    ? readContextWorkspace(eventId)?.agentPlan ?? null
    : null;
  const planLine = formatAgentPlanProgressKo(plan);
  const planPct = agentPlanPercent(plan);
  const percent = planPct ?? agent?.percent ?? 0;
  const statusLabel = agent
    ? AGENT_EXECUTION_STATUS_LABEL_KO[agent.status]
    : "대기";
  const taskLine =
    planLine ||
    agent?.liveHeadlineKo ||
    agent?.currentTaskKo ||
    copy.globe.workspaceChatEmptyHint;
  const nextLabel = agent?.nextSteps[0]?.labelKo ?? null;
  const trailView = buildAgentExecutionFeedView(activity);
  const streamOpen =
    transcriptOpen || busy || Boolean(activity?.running);
  const liveWorking = busy || Boolean(activity?.running);
  const lastUserText = [...turns]
    .reverse()
    .find((t) => t.role === "user")
    ?.text?.trim();
  const showExecutionFeed = Boolean(
    trailView &&
      (trailView.running ||
        liveWorking ||
        (lastUserText && trailView.utterance.trim() === lastUserText)),
  );

  const pickImage = useCallback(
    async (file: File | null | undefined) => {
      if (!file || !eventId || busy) return;
      if (!file.type.startsWith("image/")) {
        toast.message(copy.feed.screenshotInvalid);
        return;
      }
      toast.message(copy.feed.captureIntentFound);
      try {
        const prepared = await prepareWorkspaceImageAgentTurn({ file });
        // Prefer chat label for user bubble; Agent runs operable utterance.
        setValue("");
        await runTurn(prepared.utterance, {
          chatUserText: prepared.chatLabelKo,
          statusOverrideKo: prepared.plan?.statusKo ?? null,
        });
      } catch {
        toast.message(copy.feed.screenshotFailed);
      }
    },
    [busy, eventId, runTurn],
  );

  // Continue is human-only (Status Panel / dock button). Never auto-send 「계속해」.

  const composer = (
    <form
      className="flex items-center gap-1.5 rounded-[18px] bg-[#f5f5f7] px-2.5 py-1 ring-1 ring-black/[0.04]"
      onSubmit={(e) => {
        e.preventDefault();
        void runTurn(value);
      }}
    >
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#4e5968] transition hover:bg-black/[0.04] disabled:opacity-40"
        disabled={busy}
        onClick={() => imageInputRef.current?.click()}
        aria-label="사진 추가"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={busy}
        className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5 text-[13px] text-[#1d1d1f] outline-none placeholder:text-[#aeaeb2]"
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
  );

  return (
    <div
      className={cn(
        "pointer-events-auto w-full shrink-0",
        !embedded && "mx-auto max-w-[min(96vw,420px)]",
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
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#4e5968] disabled:opacity-40"
            disabled={busy}
            onClick={() => imageInputRef.current?.click()}
            aria-label="사진 추가"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
          </button>
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
      ) : (
        <div
          className={cn(
            "flex flex-col overflow-hidden bg-white/96 backdrop-blur-xl",
            "rounded-[22px] shadow-[0_12px_40px_rgba(25,31,40,0.14)] ring-1 ring-black/[0.06]",
            streamOpen && dockTall
              ? "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-4.5rem))]"
              : streamOpen
                ? "max-h-[min(48dvh,380px)]"
                : compact
                  ? ""
                  : "max-h-[min(42dvh,320px)]",
          )}
          data-workspace-work-stream
          data-dock-tall={dockTall ? "1" : "0"}
        >
          {streamOpen ? (
            <button
              type="button"
              className="flex w-full shrink-0 items-center justify-center pt-2 pb-0.5"
              onClick={() => setDockTall((v) => !v)}
              aria-label={dockTall ? "작업창 줄이기" : "작업창 크게"}
            >
              <span className="h-1 w-9 rounded-full bg-[#d1d6db]" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className="flex w-full shrink-0 items-center gap-2 px-3.5 py-2.5 text-left"
            onClick={() => {
              if (collapseTimerRef.current) {
                clearTimeout(collapseTimerRef.current);
                collapseTimerRef.current = null;
              }
              if (streamOpen && dockTall) {
                setDockTall(false);
                return;
              }
              if (streamOpen) {
                setTranscriptOpen(false);
                setDockTall(false);
                setAgentExpanded(false);
                return;
              }
              setTranscriptOpen(true);
              setDockTall(true);
            }}
            aria-expanded={streamOpen}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                liveWorking
                  ? "animate-pulse bg-[#3182f6]"
                  : "bg-[#d2d2d7]",
              )}
              aria-hidden
            />
            <span className="text-[11px] font-medium tracking-tight text-[#1d1d1f]">
              Agent
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-normal text-[#86868b]">
              {liveWorking
                ? trailView?.rows.find((r) => r.status === "running")?.label ||
                  taskLine
                : copy.globe.workspaceChatTitle}
            </span>
            <span className="shrink-0 text-[10px] font-medium text-[#aeaeb2]">
              {streamOpen
                ? copy.globe.workspaceWorkStreamCollapse
                : copy.globe.workspaceWorkStreamExpand(turns.length)}
            </span>
            {streamOpen ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#aeaeb2]" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#aeaeb2]" />
            )}
          </button>

          {liveWorking ? (
            <div className="mx-3.5 mb-1 flex items-center gap-1.5 px-0.5">
              <span
                className="h-1 w-1 animate-pulse rounded-full bg-[#1d1d1f]"
                aria-hidden
              />
              <span className="truncate text-[11px] font-normal text-[#86868b]">
                {trailView?.rows.find((r) => r.status === "running")?.label ??
                  taskLine}
              </span>
            </div>
          ) : null}

          {streamOpen ? (
            <div
              ref={scrollerRef}
              className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain rimvio-scroll-touch px-3.5 pb-1 pt-0.5"
            >
              {turns.length === 0 && !liveWorking ? (
                <p className="py-2 text-center text-[11px] text-[#aeaeb2]">
                  {copy.globe.workspaceChatEmptyBody}
                </p>
              ) : (
                turns.slice(-5).map((turn) => (
                  <div
                    key={turn.id}
                    className={cn(
                      "flex",
                      turn.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {turn.role === "user" ? (
                      <div className="max-w-[88%] rounded-[18px] rounded-br-[6px] bg-[#3182f6] px-3 py-1.5 text-[13px] font-medium leading-snug text-white">
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

              {/* Cursor order: user command → LIVE Execution Feed append below */}
              {showExecutionFeed && trailView ? (
                <AgentExecutionFeed view={trailView} />
              ) : null}

              {!liveWorking && agent && agent.completedSteps.length > 0 ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl bg-[#f5f5f7] px-2.5 py-1.5 text-left"
                  onClick={() => setAgentExpanded((v) => !v)}
                  aria-expanded={agentExpanded}
                  data-agent-step-collapse
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8e8ed] text-[9px] font-bold text-[#6e6e73]"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#6e6e73]">
                    {agent.completedSteps
                      .slice(-2)
                      .map((s) => s.labelKo)
                      .join(" · ")}
                  </span>
                  {agentExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-[#aeaeb2]" />
                  ) : (
                    <ChevronUp className="h-3 w-3 shrink-0 text-[#aeaeb2]" />
                  )}
                </button>
              ) : null}

              {!liveWorking && agentExpanded && agent ? (
                <div className="space-y-1 px-0.5 text-[11px] text-[#86868b]">
                  {agent.completedSteps.map((s) => (
                    <p key={`d-${s.id}`}>✓ {s.labelKo}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="shrink-0 space-y-1.5 border-t border-black/[0.04] px-2.5 py-2">
            {softChips.length > 0 ? (
              <div
                className="flex flex-wrap gap-1.5 px-0.5"
                data-network-absorb-soft-chips
              >
                {softChips.map((chip) => (
                  <button
                    key={`${chip.labelKo}:${chip.utterance}`}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (chip.utterance === ANCHOR_RETYPE_CHIP_UTTERANCE) {
                        setSoftChips([]);
                        setValue("");
                        setTranscriptOpen(true);
                        return;
                      }
                      void runTurn(chip.utterance);
                    }}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#4e5968] ring-1 ring-black/[0.06] disabled:opacity-40"
                  >
                    {chip.labelKo}
                  </button>
                ))}
              </div>
            ) : null}
            {composer}
          </div>
        </div>
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void pickImage(file);
        }}
      />
    </div>
  );
}
