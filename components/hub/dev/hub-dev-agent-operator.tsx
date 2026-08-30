"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Mic,
  Paperclip,
  PanelRightClose,
  X,
} from "lucide-react";
import { buildPlatformOperatorBrief } from "@/lib/hub/dev/platform-operator-brief";
import type { OperatorDiff } from "@/lib/hub/dev/operator-diff";
import {
  type OperatorAgentEntry,
  type OperatorConversationEntry,
  type OperatorPlanningItem,
  isWorkingEntry,
} from "@/lib/hub/dev/operator-conversation";
import { HubDevOperatorAgentBridge } from "@/components/hub/dev/hub-dev-operator-agent-bridge";
import { HubDevOperatorConversation } from "@/components/hub/dev/hub-dev-operator-conversation";
import type { HubAgentControllerEvent } from "@/lib/hub/dev/hub-agent-controller";
import {
  changesFromLog,
  terminalLinesFromLog,
  mergeControllerEventToSharedLog,
  readSharedAgentEventLog,
  type AgentEventLog,
} from "@/lib/agent/events";
import { listHubCheckpoints } from "@/lib/hub/dev/hub-checkpoint-store";
import { AgentActivityPanel } from "@/components/agent/agent-activity-panel";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectIssue, DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { cn } from "@/lib/utils";
import { HubOperatorModelPicker } from "@/components/hub/dev/hub-operator-model-picker";
import {
  HubOperatorMessageQueue,
  createOperatorQueuedMessage,
  type OperatorQueuedMessage,
} from "@/components/hub/dev/hub-operator-message-queue";
import {
  readOperatorModelPreference,
  resolveActiveOperatorModel,
  writeActiveOperatorModelSession,
} from "@/lib/hub/dev/operator-model-preference";

type OperatorTab = "chat" | "changes" | "terminal" | "activity";
type OperatorRunMode = "auto" | "plan";

const OPERATOR_MODE_KEY = "rimvio-hub-operator-run-mode";

type HubDevAgentOperatorProps = {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly testsPassed: boolean;
  readonly analyzing: boolean;
  readonly executor: DeployExecutorCallbacks;
  readonly onApplyPatch: (patch: Partial<PlatformDraft>) => void;
  readonly agentSeed: string | null;
  readonly onSeedConsumed: () => void;
  readonly fixing: boolean;
  readonly publishReady: boolean;
  readonly operatorDiff: OperatorDiff | null;
  readonly onApplyDiff: () => void;
  readonly onDismissDiff: () => void;
  readonly onFixAll: () => void;
  readonly onFixIssue: (issue: DevProjectIssue) => void;
  readonly onPublish: () => void;
  readonly onRunTests: () => void;
  readonly onFocusAde: () => void;
  readonly onAskOperator: (text: string) => void;
  readonly onReviewAllChanges: () => void;
  readonly stripeConnected?: boolean;
  readonly onConnectStripe?: () => void;
  readonly onConnectGithub?: () => void;
  readonly onConnectVercel?: () => void;
  readonly onConnectSupabase?: () => void;
  readonly onApprovePublish?: () => void;
  readonly onUndoCheckpoint?: () => void;
  readonly resumeLoopToken?: number;
  readonly resumeUtterance?: string | null;
  readonly resumeProvider?: import("@/lib/integrations/hub-platform/connection-types").HubPlatformProviderId | null;
  readonly onFileTouch?: (paths: readonly string[], touch: "reading" | "modified" | "created" | "running") => void;
  readonly onAgentRunningChange?: (running: boolean) => void;
  readonly agentRunning?: boolean;
  readonly autoFocusTab?: OperatorTab | null;
  readonly onAcceptAllChanges?: () => void;
  readonly onPreview?: () => void;
};

function readOperatorRunMode(): OperatorRunMode {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(OPERATOR_MODE_KEY);
  return stored === "plan" ? "plan" : "auto";
}

function writeOperatorRunMode(mode: OperatorRunMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OPERATOR_MODE_KEY, mode);
}

const PLANNING_IDLE: OperatorPlanningItem[] = [
  { label: "Plan created", status: "done" },
  { label: "Setup verified", status: "done" },
  { label: "Analyzing platform", status: "running" },
];

const PLANNING_FIX: OperatorPlanningItem[] = [
  { label: "Plan created", status: "done" },
  { label: "Reading issues", status: "done" },
  { label: "Applying fixes", status: "running" },
];

export function HubDevAgentOperator(props: HubDevAgentOperatorProps) {
  const brief = buildPlatformOperatorBrief(props.snapshot, { fixing: props.fixing });
  const [tab, setTab] = useState<OperatorTab>("chat");
  const [chatInput, setChatInput] = useState("");
  const [runMode, setRunMode] = useState<OperatorRunMode>(() => readOperatorRunMode());
  const [collapsed, setCollapsed] = useState(false);
  const [entries, setEntries] = useState<OperatorConversationEntry[]>([]);
  const [agentEventLog, setAgentEventLog] = useState<AgentEventLog>(() => readSharedAgentEventLog());
  const [messageQueue, setMessageQueue] = useState<OperatorQueuedMessage[]>([]);
  const [showQueueActions, setShowQueueActions] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevFixing = useRef(false);
  const prevAnalyzing = useRef(false);
  const prevBusyRef = useRef(false);
  const platformAnalyzeActive = useRef(false);
  const lastDiffId = useRef<string | null>(null);
  const localSendRef = useRef<string | null>(null);
  const loopActiveRef = useRef(false);

  const showGreeting = props.snapshot.capabilityCount > 0 && !entries.some((e) => e.kind === "user");

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  const buildAnalysisEntry = useCallback((): OperatorAgentEntry => {
    const b = buildPlatformOperatorBrief(props.snapshot, { fixing: false });
    return {
      kind: "agent",
      id: `a-${Date.now()}`,
      at: Date.now(),
      payload: {
        type: "analysis",
        headline: b.headline,
        bullets: b.bullets,
        issues: [...props.snapshot.issues.slice(0, 4)],
        changes: [...props.snapshot.changes.slice(0, 8)],
        changesCount: props.snapshot.changesCount,
      },
    };
  }, [props.snapshot]);

  const buildPlanningEntry = useCallback(
    (items: OperatorPlanningItem[], title = "Planning and starting work"): OperatorAgentEntry => ({
      kind: "agent",
      id: `p-${Date.now()}`,
      at: Date.now(),
      payload: { type: "planning", title, items },
    }),
    [],
  );

  const replacePlanningWithAnalysis = useCallback(() => {
    setEntries((prev) => {
      const withoutPlanning = prev.filter((e) => !isWorkingEntry(e));
      const last = withoutPlanning[withoutPlanning.length - 1];
      if (last?.kind === "agent" && last.payload.type === "analysis") return withoutPlanning;
      return [...withoutPlanning, buildAnalysisEntry()];
    });
    scrollToBottom();
  }, [buildAnalysisEntry, scrollToBottom]);

  const ensurePlanningEntry = useCallback(
    (items: OperatorPlanningItem[]) => {
      setEntries((prev) => {
        if (prev.some(isWorkingEntry)) return prev;
        return [...prev, buildPlanningEntry(items)];
      });
      scrollToBottom();
    },
    [buildPlanningEntry, scrollToBottom],
  );

  const appendUserTurn = useCallback(
    (text: string) => {
      setEntries((prev) => {
        const last = prev[prev.length - 1];
        if (last?.kind === "user" && last.text === text) return prev;
        return [...prev, { kind: "user" as const, id: `u-${Date.now()}`, text, at: Date.now() }];
      });
      scrollToBottom();
    },
    [scrollToBottom],
  );

  const appendTestResult = useCallback(
    (running: boolean) => {
      setEntries((prev) => [
        ...prev.filter((e) => !(e.kind === "agent" && e.payload.type === "testResult")),
        {
          kind: "agent" as const,
          id: `t-${Date.now()}`,
          at: Date.now(),
          payload: {
            type: "testResult" as const,
            passed: props.snapshot.testsPassed,
            total: props.snapshot.testsTotal,
            running,
          },
        },
      ]);
      scrollToBottom();
    },
    [props.snapshot.testsPassed, props.snapshot.testsTotal, scrollToBottom],
  );

  const handleAskUserAction = useCallback(
    (actionId: string) => {
      if (actionId === "connect_stripe") {
        props.onConnectStripe?.();
        return;
      }
      if (actionId === "connect_github") {
        props.onConnectGithub?.();
        return;
      }
      if (actionId === "connect_vercel") {
        props.onConnectVercel?.();
        return;
      }
      if (actionId === "connect_supabase") {
        props.onConnectSupabase?.();
        return;
      }
      if (actionId === "approve_publish") {
        props.onApprovePublish?.();
        return;
      }
      if (actionId.startsWith("confirm_deploy:")) {
        const raw = actionId.slice("confirm_deploy:".length);
        const tokens = raw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const utterance =
          tokens.includes("personal") && tokens.includes("main")
            ? "전부 배포"
            : tokens.includes("main")
              ? "배포해 main"
              : "배포해 personal";
        props.onAskOperator(utterance);
      }
    },
    [props.onConnectStripe, props.onConnectGithub, props.onConnectVercel, props.onConnectSupabase, props.onApprovePublish, props.onAskOperator],
  );

  const handleLoopEvent = useCallback(
    (event: HubAgentControllerEvent) => {
      const next = mergeControllerEventToSharedLog(event);
      setAgentEventLog(next);

      if (event.type === "conversational") {
        loopActiveRef.current = false;
        props.onAgentRunningChange?.(false);
        setEntries((prev) => [
          ...prev.filter((e) => !isWorkingEntry(e)),
          {
            kind: "agent" as const,
            id: `conv-${Date.now()}`,
            at: Date.now(),
            payload: {
              type: "text" as const,
              body: event.body,
              suggestedActions: event.suggestedActions,
            },
          },
        ]);
        scrollToBottom();
        return;
      }

      if (event.type === "intent" && !event.executable) {
        loopActiveRef.current = false;
        props.onAgentRunningChange?.(false);
        return;
      }

      if (event.type === "intent" && event.executable) {
        props.onAgentRunningChange?.(true);
      }

      loopActiveRef.current = event.type !== "complete" && event.type !== "final_report";
      if (event.type === "complete" || event.type === "final_report") {
        props.onAgentRunningChange?.(false);
      }
      setEntries((prev) => {
        const base = prev.filter((e) => !(e.kind === "agent" && e.payload.type === "planning"));

        switch (event.type) {
          case "text":
            return [
              ...base,
              {
                kind: "agent" as const,
                id: `txt-${Date.now()}`,
                at: Date.now(),
                payload: { type: "text" as const, body: event.body },
              },
            ];
          case "observe":
            return [
              ...base,
              {
                kind: "agent" as const,
                id: `obs-${Date.now()}`,
                at: Date.now(),
                payload: { type: "observe" as const, lines: event.lines },
              },
            ];
          case "plan":
            return [
              ...base,
              {
                kind: "agent" as const,
                id: `plan-${Date.now()}`,
                at: Date.now(),
                payload: {
                  type: "planning" as const,
                  title: "Planning and starting work",
                  items: event.steps,
                },
              },
            ];
          case "thought":
            return [
              ...base,
              {
                kind: "agent" as const,
                id: `th-${Date.now()}`,
                at: Date.now(),
                payload: { type: "thought" as const, title: event.title, body: event.body },
              },
            ];
          case "terminal":
            return [
              ...base.filter(
                (e) =>
                  !(
                    e.kind === "agent" &&
                    e.payload.type === "terminal" &&
                    e.payload.title === event.title
                  ),
              ),
              {
                kind: "agent" as const,
                id: `term-${event.title}`,
                at: Date.now(),
                payload: {
                  type: "terminal" as const,
                  title: event.title,
                  lines: event.lines,
                  waiting: event.waiting,
                },
              },
            ];
          case "verify":
            return [
              ...base,
              {
                kind: "agent" as const,
                id: `ver-${Date.now()}`,
                at: Date.now(),
                payload: { type: "verify" as const, ok: event.ok, detail: event.detail },
              },
            ];
          case "ask_user":
            loopActiveRef.current = false;
            props.onAgentRunningChange?.(false);
            return [
              ...base,
              {
                kind: "agent" as const,
                id: `ask-${Date.now()}`,
                at: Date.now(),
                payload: {
                  type: "askUser" as const,
                  message: event.message,
                  actionId: event.actionId,
                  actionLabel: event.actionLabel,
                  publishGate: event.publishGate,
                },
              },
            ];
          case "complete":
            loopActiveRef.current = false;
            return [
              ...base,
              {
                kind: "agent" as const,
                id: `done-${Date.now()}`,
                at: Date.now(),
                payload: { type: "complete" as const, summary: event.summary },
              },
            ];
          case "final_report":
            loopActiveRef.current = false;
            props.onAgentRunningChange?.(false);
            return [
              ...base.filter((e) => !(e.kind === "agent" && e.payload.type === "complete")),
              {
                kind: "agent" as const,
                id: `report-${Date.now()}`,
                at: Date.now(),
                payload: { type: "finalReport" as const, report: event.report },
              },
            ];
          case "file_touch":
            props.onFileTouch?.(event.paths, event.touch);
            return base;
          case "test_result":
            return [
              ...base.filter((e) => !(e.kind === "agent" && e.payload.type === "testResult")),
              {
                kind: "agent" as const,
                id: `t-${Date.now()}`,
                at: Date.now(),
                payload: {
                  type: "testResult" as const,
                  passed: event.passed,
                  total: event.total,
                  running: event.running,
                },
              },
            ];
          case "tool":
          case "intent":
            return base;
          default:
            return prev;
        }
      });
      scrollToBottom();
    },
    [props.onFileTouch, props.onAgentRunningChange, scrollToBottom],
  );

  useEffect(() => {
    if (!props.autoFocusTab) return;
    setTab(props.autoFocusTab);
  }, [props.autoFocusTab]);

  const isOperatorBusy = Boolean(props.agentRunning || props.fixing || props.analyzing);

  const contextFileCount = Math.max(
    props.snapshot.changesCount,
    props.snapshot.changes.length,
    props.snapshot.capabilityCount,
  );

  const dispatchMessage = useCallback(
    (text: string) => {
      localSendRef.current = text;
      loopActiveRef.current = false;
      writeActiveOperatorModelSession(
        resolveActiveOperatorModel({ preference: readOperatorModelPreference(), configured: {} }),
      );
      writeOperatorRunMode(runMode);
      appendUserTurn(text);
      props.onAskOperator(text);
      setChatInput("");
      setTab("chat");
    },
    [appendUserTurn, props, runMode],
  );

  const enqueueMessage = useCallback(
    (text: string) => {
      setMessageQueue((prev) => [...prev, createOperatorQueuedMessage(text, contextFileCount)]);
      setShowQueueActions(true);
      setChatInput("");
    },
    [contextFileCount],
  );

  useEffect(() => {
    if (prevBusyRef.current && !isOperatorBusy && messageQueue.length > 0) {
      const [next, ...rest] = messageQueue;
      setMessageQueue(rest);
      if (rest.length === 0) {
        setShowQueueActions(false);
      }
      dispatchMessage(next.text);
    }
    prevBusyRef.current = isOperatorBusy;
  }, [dispatchMessage, isOperatorBusy, messageQueue]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" || !event.ctrlKey || !event.shiftKey) return;
      if (messageQueue.length === 0) return;
      event.preventDefault();
      setMessageQueue([]);
      setShowQueueActions(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [messageQueue.length]);

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;

    if (isOperatorBusy) {
      enqueueMessage(text);
      return;
    }

    dispatchMessage(text);
  };

  const handleSendImmediately = useCallback(() => {
    setMessageQueue((prev) => {
      if (prev.length === 0) return prev;
      const target = prev[prev.length - 1]!;
      const reordered = [target, ...prev.filter((item) => item.id !== target.id)];
      if (!isOperatorBusy) {
        window.setTimeout(() => dispatchMessage(target.text), 0);
        return reordered.slice(1);
      }
      return reordered;
    });
    setShowQueueActions(false);
  }, [dispatchMessage, isOperatorBusy]);

  const handleReviewQueued = useCallback((message: OperatorQueuedMessage) => {
    setMessageQueue((prev) => prev.filter((item) => item.id !== message.id));
    setChatInput(message.text);
    setShowQueueActions(false);
  }, []);

  const handleStopQueue = useCallback(() => {
    setMessageQueue([]);
    setShowQueueActions(false);
  }, []);

  useEffect(() => {
    if (!props.agentSeed?.trim()) return;
    const text = props.agentSeed.trim();
    if (localSendRef.current === text) {
      localSendRef.current = null;
      return;
    }
    appendUserTurn(text);
  }, [appendUserTurn, props.agentSeed]);

  useEffect(() => {
    if (props.fixing) {
      ensurePlanningEntry(PLANNING_FIX);
      prevFixing.current = true;
      return;
    }
    if (prevFixing.current) {
      replacePlanningWithAnalysis();
      appendTestResult(true);
      window.setTimeout(() => appendTestResult(false), 800);
      prevFixing.current = false;
    }
  }, [props.fixing, ensurePlanningEntry, replacePlanningWithAnalysis, appendTestResult]);

  useEffect(() => {
    if (props.analyzing) {
      platformAnalyzeActive.current = true;
      ensurePlanningEntry(PLANNING_IDLE);
      prevAnalyzing.current = true;
      return;
    }
    if (prevAnalyzing.current && platformAnalyzeActive.current) {
      replacePlanningWithAnalysis();
      platformAnalyzeActive.current = false;
      prevAnalyzing.current = false;
    }
  }, [props.analyzing, ensurePlanningEntry, replacePlanningWithAnalysis]);

  useEffect(() => {
    if (props.fixing || props.analyzing || loopActiveRef.current) return;
    if (!entries.some(isWorkingEntry)) return;

    const timer = window.setTimeout(() => {
      setEntries((prev) => {
        if (!prev.some(isWorkingEntry)) return prev;
        return prev.filter((e) => !isWorkingEntry(e));
      });
      scrollToBottom();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [props.fixing, props.analyzing, entries, scrollToBottom]);

  useEffect(() => {
    if (!props.operatorDiff) return;
    if (lastDiffId.current === props.operatorDiff.filePath) return;
    lastDiffId.current = props.operatorDiff.filePath;
    setEntries((prev) => [
      ...prev.filter((e) => !(e.kind === "agent" && e.payload.type === "diff")),
      {
        kind: "agent" as const,
        id: `d-${Date.now()}`,
        at: Date.now(),
        payload: { type: "diff" as const, diff: props.operatorDiff! },
      },
      {
        kind: "agent" as const,
        id: `txt-${Date.now()}`,
        at: Date.now(),
        payload: { type: "text" as const, body: "Changes applied. Running tests…" },
      },
    ]);
    scrollToBottom();
  }, [props.operatorDiff, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(entries.length > 0 ? "smooth" : "auto");
  }, [entries.length, scrollToBottom]);

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col border-l border-[#e5e7eb] bg-white">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex h-10 w-full items-center justify-center text-[#9ca3af] hover:bg-[#f9fafb] hover:text-violet-600"
          aria-label="Open Platform Operator"
        >
          <PanelRightClose className="size-4 rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex w-[340px] shrink-0 flex-col border-l border-[#e5e7eb] bg-[#f9fafb] xl:w-[380px]">
      <HubDevOperatorAgentBridge
        draft={props.draft}
        snapshot={props.snapshot}
        testsPassed={props.testsPassed}
        executor={props.executor}
        onApplyPatch={props.onApplyPatch}
        agentSeed={props.agentSeed}
        onSeedConsumed={props.onSeedConsumed}
        onLoopEvent={handleLoopEvent}
        stripeConnected={props.stripeConnected}
        resumeLoopToken={props.resumeLoopToken}
        resumeUtterance={props.resumeUtterance}
        resumeProvider={props.resumeProvider}
      />

      <div className="shrink-0 border-b border-[#e5e7eb] bg-white px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[12px] font-bold text-[#111827]">Platform Operator</p>
              <span className="rounded-full bg-violet-100 px-1.5 py-px text-[8px] font-bold uppercase text-violet-700">
                AI
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => setCollapsed(true)} className="rounded p-1 text-[#9ca3af] hover:bg-[#f3f4f6]">
              <PanelRightClose className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded p-1 text-[#9ca3af] hover:bg-[#f3f4f6]"
              aria-label="Close Platform Operator"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex gap-0 border-b border-[#eef0f3]">
          {(
            [
              ["chat", "Chat", undefined],
              ["changes", "Changes", props.snapshot.changesCount || undefined],
              ["terminal", "Terminal", undefined],
              ["activity", "Activity", undefined],
            ] as const
          ).map(([id, label, badge]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "relative px-2.5 pb-1.5 pt-0.5 text-[10px] font-semibold",
                tab === id ? "text-violet-700" : "text-[#9ca3af] hover:text-[#6b7280]",
              )}
            >
              {label}
              {badge ? (
                <span className="ml-0.5 inline-flex min-w-[14px] items-center justify-center rounded-full bg-[#eef0f3] px-1 text-[8px] font-bold tabular-nums text-[#6b7280]">
                  {badge}
                </span>
              ) : null}
              {tab === id ? <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-violet-600" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rimvio-scroll-touch">
        {tab === "chat" ? (
          <div className="flex min-h-full flex-col">
            <HubDevOperatorConversation
              entries={entries}
              showGreeting={showGreeting}
              onFixIssue={props.onFixIssue}
              onReviewAll={props.onReviewAllChanges}
              onApplyDiff={props.onApplyDiff}
              onRunTests={props.onRunTests}
              onDismissDiff={props.onDismissDiff}
              onAskUserAction={handleAskUserAction}
              onSuggestedUtterance={props.onAskOperator}
              onPreview={props.onPreview}
              onPublish={props.onPublish}
            />
            <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
          </div>
        ) : null}
        {tab === "changes" ? (
          <ChangesTab
            log={agentEventLog}
            snapshot={props.snapshot}
            checkpointCount={listHubCheckpoints(props.draft.id).length}
            onUndo={props.onUndoCheckpoint}
          />
        ) : null}
        {tab === "terminal" ? <TerminalTab log={agentEventLog} /> : null}
        {tab === "activity" ? <AgentActivityPanel log={agentEventLog} /> : null}
      </div>

      {tab === "chat" ? (
        <OperatorComposerPanel
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSend={sendChat}
          sendDisabled={!chatInput.trim()}
          isBusy={isOperatorBusy}
          runMode={runMode}
          onRunModeChange={setRunMode}
          changesCount={props.snapshot.changesCount}
          checkpointCount={listHubCheckpoints(props.draft.id).length}
          onReviewAll={props.onReviewAllChanges}
          onUndoAll={props.onUndoCheckpoint}
          onOpenChanges={() => setTab("changes")}
          onKeepAll={props.onAcceptAllChanges}
          messageQueue={messageQueue}
          showQueueActions={showQueueActions}
          onKeepQueuing={() => setShowQueueActions(false)}
          onSendImmediately={handleSendImmediately}
          onStopQueue={handleStopQueue}
          onReviewQueued={handleReviewQueued}
        />
      ) : null}
    </div>
  );
}

function OperatorComposerPanel({
  chatInput,
  onChatInputChange,
  onSend,
  sendDisabled,
  isBusy,
  runMode,
  onRunModeChange,
  changesCount,
  checkpointCount,
  onReviewAll,
  onUndoAll,
  onOpenChanges,
  onKeepAll,
  messageQueue,
  showQueueActions,
  onKeepQueuing,
  onSendImmediately,
  onStopQueue,
  onReviewQueued,
}: {
  chatInput: string;
  onChatInputChange: (v: string) => void;
  onSend: () => void;
  sendDisabled: boolean;
  isBusy: boolean;
  runMode: OperatorRunMode;
  onRunModeChange: (m: OperatorRunMode) => void;
  changesCount: number;
  checkpointCount: number;
  onReviewAll: () => void;
  onUndoAll?: () => void;
  onOpenChanges: () => void;
  onKeepAll?: () => void;
  messageQueue: readonly OperatorQueuedMessage[];
  showQueueActions: boolean;
  onKeepQueuing: () => void;
  onSendImmediately: () => void;
  onStopQueue: () => void;
  onReviewQueued: (message: OperatorQueuedMessage) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);
  const [composerHint, setComposerHint] = useState<string | null>(null);

  const syncHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 72), 160)}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [chatInput, syncHeight]);

  const showChangesBar = changesCount > 0 || checkpointCount > 0;

  return (
    <div className="shrink-0 bg-[#f9fafb] px-3 pb-3 pt-2">
      {showChangesBar ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-[#e5e7eb] bg-white px-2.5 py-1.5 shadow-sm">
          <button
            type="button"
            onClick={onOpenChanges}
            className="truncate text-left font-mono text-[10px] font-medium text-[#6b7280] hover:text-violet-700"
          >
            › {changesCount || checkpointCount} Changes
          </button>
          <div className="flex shrink-0 items-center gap-1">
            {onUndoAll && checkpointCount > 0 ? (
              <button
                type="button"
                onClick={onUndoAll}
                className="rounded-md px-2 py-1 text-[10px] font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
              >
                Undo All
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onKeepAll?.();
                onOpenChanges();
              }}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
            >
              Keep All
            </button>
            <button
              type="button"
              onClick={onReviewAll}
              className="rounded-md bg-[#111827] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#1f2937]"
            >
              Review
            </button>
          </div>
        </div>
      ) : null}

      <HubOperatorMessageQueue
        queue={messageQueue}
        showActions={showQueueActions}
        onKeepQueuing={onKeepQueuing}
        onSendImmediately={onSendImmediately}
        onStop={onStopQueue}
        onReview={onReviewQueued}
      />

      <div
        className={cn(
          "overflow-hidden rounded-[26px] border border-[#e5e7eb] bg-white",
          "shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]",
          "transition-shadow focus-within:border-violet-300 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]",
          isBusy && "opacity-95",
        )}
      >
        {isBusy ? (
          <div className="border-b border-[#f3f4f6] px-4 py-1.5 text-[10px] font-medium text-violet-700">
            Operator 작업 중… 새 메시지는 대기열에 쌓여요
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!sendDisabled) onSend();
            }
          }}
          rows={1}
          placeholder={
            isBusy
              ? "Add a follow-up — 작업이 끝나면 순서대로 실행돼요"
              : "Plan, Build — / skills · @ context · 무엇을 할까요?"
          }
          className="block w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[12px] leading-[1.55] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none"
          style={{ minHeight: 72, maxHeight: 160 }}
        />
        {composerHint ? (
          <p className="px-4 pb-1 text-[10px] text-amber-700">{composerHint}</p>
        ) : null}

        <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <ComposerPill
              label="Operator"
              active
              onClick={() => textareaRef.current?.focus()}
            />
            <HubOperatorModelPicker />
            <ComposerRunModePill runMode={runMode} onRunModeChange={onRunModeChange} />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <input
              ref={attachRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const names = e.target.files ? [...e.target.files].map((f) => f.name) : [];
                if (names.length) {
                  onChatInputChange(
                    chatInput ? `${chatInput}\n이 파일을 연결해줘: ${names.join(", ")}` : `이 파일을 연결해줘: ${names.join(", ")}`,
                  );
                }
                e.target.value = "";
              }}
            />
            <ComposerIconButton label="Attach file" onClick={() => attachRef.current?.click()}>
              <Paperclip className="size-4" />
            </ComposerIconButton>
            <ComposerIconButton
              label="Voice input"
              onClick={() => {
                const w = window as unknown as {
                  SpeechRecognition?: new () => {
                    lang: string;
                    start: () => void;
                    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
                  };
                  webkitSpeechRecognition?: new () => {
                    lang: string;
                    start: () => void;
                    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
                  };
                };
                const Speech = w.SpeechRecognition ?? w.webkitSpeechRecognition;
                if (!Speech) {
                  setComposerHint("이 브라우저에서는 음성 입력을 쓸 수 없어요. 텍스트로 입력하세요.");
                  return;
                }
                const rec = new Speech();
                rec.lang = "ko-KR";
                rec.onresult = (event) => {
                  const spoken = event.results[0]?.[0]?.transcript ?? "";
                  if (spoken) onChatInputChange(chatInput ? `${chatInput} ${spoken}` : spoken);
                };
                rec.start();
              }}
            >
              <Mic className="size-4" />
            </ComposerIconButton>
            <button
              type="button"
              onClick={onSend}
              disabled={sendDisabled}
              aria-label="Send message"
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                sendDisabled
                  ? "bg-[#e5e7eb] text-[#9ca3af]"
                  : "bg-violet-600 text-white hover:bg-violet-700",
              )}
            >
              <ArrowUp className="size-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComposerPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
        active
          ? "bg-violet-50 text-violet-700 ring-1 ring-violet-100"
          : "bg-[#f3f4f6] text-[#6b7280]",
      )}
    >
      {label}
      <ChevronDown className="size-3 opacity-70" />
    </button>
  );
}

function ComposerRunModePill({
  runMode,
  onRunModeChange,
}: {
  runMode: OperatorRunMode;
  onRunModeChange: (m: OperatorRunMode) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full bg-[#f3f4f6] py-1 pl-2.5 pr-1.5 text-[10px] font-semibold capitalize text-[#6b7280]",
          "hover:bg-[#eceff3] focus:outline-none focus:ring-2 focus:ring-violet-100",
          open && "bg-[#eceff3]",
        )}
      >
        {runMode}
        <ChevronDown className={cn("size-3 opacity-70", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-[110] mb-2 min-w-[108px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white py-1 shadow-lg">
          {(["auto", "plan"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                onRunModeChange(mode);
                writeOperatorRunMode(mode);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-medium capitalize hover:bg-[#f9fafb]",
                runMode === mode ? "text-violet-700" : "text-[#374151]",
              )}
            >
              {mode}
              {runMode === mode ? <Check className="size-3.5 text-violet-600" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ComposerIconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#6b7280]"
    >
      {children}
    </button>
  );
}

function ChangesTab({
  log,
  snapshot,
  checkpointCount = 0,
  onUndo,
}: {
  log: AgentEventLog;
  snapshot: DevProjectSnapshot;
  checkpointCount?: number;
  onUndo?: () => void;
}) {
  const fromEvents = changesFromLog(log);
  const rows =
    fromEvents.length > 0
      ? fromEvents
      : snapshot.changes.map((ch) => ({
          id: ch.id,
          path: ch.path,
          kind: ch.kind === "add" ? ("add" as const) : ("modify" as const),
        }));
  if (rows.length === 0) {
    return <p className="p-4 text-center text-[10px] text-[#9ca3af]">No pending changes</p>;
  }
  return (
    <div>
      {checkpointCount > 0 && onUndo ? (
        <div className="flex items-center justify-between border-b border-[#eef0f3] px-2 py-1.5">
          <span className="text-[9px] text-[#6b7280]">{checkpointCount} checkpoint(s)</span>
          <button
            type="button"
            onClick={onUndo}
            className="rounded-md bg-[#eef0f3] px-2 py-0.5 text-[9px] font-semibold text-[#374151] hover:bg-violet-50 hover:text-violet-700"
          >
            Undo
          </button>
        </div>
      ) : null}
      <ul className="space-y-0.5 p-2 font-mono text-[9px]">
      {rows.map((ch) => (
        <li key={ch.id} className="rounded-md border border-[#e5e7eb] bg-white px-2 py-1 text-[#4b5563]">
          <span className={ch.kind === "add" ? "text-emerald-600" : "text-cyan-600"}>
            {ch.kind === "add" ? "+" : "~"}
          </span>{" "}
          {ch.path}
        </li>
      ))}
    </ul>
    </div>
  );
}

function TerminalTab({ log }: { log: AgentEventLog }) {
  const lines = terminalLinesFromLog(log);
  if (lines.length === 0) {
    return (
      <div className="bg-[#1a1d24] p-2.5 font-mono text-[9px] leading-relaxed text-[#6b7280]">
        Agent 실행 로그가 여기 표시됩니다.
      </div>
    );
  }
  return (
    <div className="bg-[#1a1d24] p-2.5 font-mono text-[9px] leading-relaxed">
      {lines.map((line, i) => (
        <p key={i} className="text-[#9ca3af]">
          {line}
        </p>
      ))}
    </div>
  );
}
