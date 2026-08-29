"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Mic,
  Paperclip,
  PanelRightClose,
  Send,
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
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectIssue, DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { cn } from "@/lib/utils";

type OperatorTab = "chat" | "changes" | "terminal" | "activity";

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
};

const MODELS = ["Claude 3.5 Sonnet", "GPT-4o", "Gemini 1.5 Pro"] as const;

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
  const [model, setModel] = useState<(typeof MODELS)[number]>(MODELS[0]);
  const [collapsed, setCollapsed] = useState(false);
  const [entries, setEntries] = useState<OperatorConversationEntry[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevFixing = useRef(false);
  const prevAnalyzing = useRef(false);
  const lastDiffId = useRef<string | null>(null);
  const localSendRef = useRef<string | null>(null);

  const showGreeting = props.snapshot.capabilityCount > 0;

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

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    localSendRef.current = text;
    appendUserTurn(text);
    ensurePlanningEntry(PLANNING_IDLE);
    props.onAskOperator(text);
    setChatInput("");
    setTab("chat");
  };

  useEffect(() => {
    if (!props.agentSeed?.trim()) return;
    const text = props.agentSeed.trim();
    if (localSendRef.current === text) {
      localSendRef.current = null;
      return;
    }
    appendUserTurn(text);
    ensurePlanningEntry(props.fixing ? PLANNING_FIX : PLANNING_IDLE);
  }, [appendUserTurn, ensurePlanningEntry, props.agentSeed, props.fixing]);

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
      ensurePlanningEntry(PLANNING_IDLE);
      prevAnalyzing.current = true;
      return;
    }
    if (prevAnalyzing.current && entries.some((e) => e.kind === "user")) {
      replacePlanningWithAnalysis();
      prevAnalyzing.current = false;
    }
  }, [props.analyzing, entries, ensurePlanningEntry, replacePlanningWithAnalysis]);

  useEffect(() => {
    if (props.fixing || props.analyzing) return;
    if (!entries.some(isWorkingEntry)) return;

    const timer = window.setTimeout(() => {
      setEntries((prev) => {
        if (!prev.some(isWorkingEntry)) return prev;
        const withoutPlanning = prev.filter((e) => !isWorkingEntry(e));
        const last = withoutPlanning[withoutPlanning.length - 1];
        if (last?.kind === "agent" && last.payload.type === "analysis") return withoutPlanning;

        if (props.snapshot.capabilityCount > 0) {
          return [...withoutPlanning, buildAnalysisEntry()];
        }
        return [
          ...withoutPlanning,
          {
            kind: "agent" as const,
            id: `t-${Date.now()}`,
            at: Date.now(),
            payload: {
              type: "text" as const,
              body: "요청을 받았습니다. Workspace에서 source를 연결하거나 데모를 로드해 주세요.",
            },
          },
        ];
      });
      scrollToBottom();
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    props.fixing,
    props.analyzing,
    entries,
    props.snapshot.capabilityCount,
    buildAnalysisEntry,
    scrollToBottom,
  ]);

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
        testsPassed={props.testsPassed}
        executor={props.executor}
        onApplyPatch={props.onApplyPatch}
        agentSeed={props.agentSeed}
        onSeedConsumed={props.onSeedConsumed}
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
            <div className="relative mt-0.5 inline-flex items-center">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as (typeof MODELS)[number])}
                className="appearance-none bg-transparent pr-4 text-[10px] font-medium text-[#6b7280] focus:outline-none"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 text-[#9ca3af]" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => setCollapsed(true)} className="rounded p-1 text-[#9ca3af] hover:bg-[#f3f4f6]">
              <PanelRightClose className="size-3.5" />
            </button>
            <button type="button" className="rounded p-1 text-[#9ca3af] hover:bg-[#f3f4f6]">
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
            />
            <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
          </div>
        ) : null}
        {tab === "changes" ? <ChangesTab snapshot={props.snapshot} /> : null}
        {tab === "terminal" ? <TerminalTab /> : null}
        {tab === "activity" ? <ActivityTab snapshot={props.snapshot} /> : null}
      </div>

      {tab === "chat" ? (
        <div className="shrink-0 border-t border-[#e5e7eb] bg-white px-3 py-2.5">
          <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] focus-within:border-violet-300 focus-within:ring-1 focus-within:ring-violet-100">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              rows={3}
              placeholder="다음 작업을 알려주세요… (예: 호텔 예약 기능 테스트해줘)"
              className="w-full resize-none bg-transparent px-3 pt-2.5 text-[11px] leading-relaxed text-[#374151] placeholder:text-[#9ca3af] focus:outline-none"
            />
            <div className="flex items-center justify-between px-2.5 pb-2">
              <button type="button" className="flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-medium text-violet-600">
                Operator
                <ChevronDown className="size-2.5" />
              </button>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded p-1 text-[#9ca3af] hover:text-[#6b7280]">
                  <Paperclip className="size-3.5" />
                </button>
                <button type="button" className="rounded p-1 text-[#9ca3af] hover:text-[#6b7280]">
                  <Mic className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={sendChat}
                  disabled={!chatInput.trim() || props.fixing || props.analyzing}
                  className="flex size-7 items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-40"
                >
                  <Send className="size-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChangesTab({ snapshot }: { snapshot: DevProjectSnapshot }) {
  if (snapshot.changes.length === 0) {
    return <p className="p-4 text-center text-[10px] text-[#9ca3af]">No pending changes</p>;
  }
  return (
    <ul className="space-y-0.5 p-2 font-mono text-[9px]">
      {snapshot.changes.map((ch) => (
        <li key={ch.id} className="rounded-md border border-[#e5e7eb] bg-white px-2 py-1 text-[#4b5563]">
          <span className={ch.kind === "add" ? "text-emerald-600" : "text-cyan-600"}>
            {ch.kind === "add" ? "+" : "~"}
          </span>{" "}
          {ch.path}
        </li>
      ))}
    </ul>
  );
}

function TerminalTab() {
  return (
    <div className="bg-[#1a1d24] p-2.5 font-mono text-[9px] leading-relaxed">
      <p className="text-[#9ca3af]">$ rimvio test --platform osaka-stay</p>
      <p className="text-[#6b7280]">Running capability sandbox…</p>
      <p className="text-emerald-400">✓ hotel.search</p>
      <p className="text-emerald-400">✓ booking.confirm</p>
      <p className="text-amber-400">⚠ payment.commit — approval policy</p>
    </div>
  );
}

function ActivityTab({ snapshot }: { snapshot: DevProjectSnapshot }) {
  return (
    <ul className="space-y-1.5 p-2.5">
      {snapshot.activities.map((a) => (
        <li key={a.id} className="flex items-center gap-1.5 text-[9px] text-[#4b5563]">
          <span
            className={cn(
              "size-1.5 rounded-full",
              a.status === "done" ? "bg-emerald-500" : a.status === "warning" ? "bg-amber-500" : "bg-[#d1d5db]",
            )}
          />
          {a.label}
        </li>
      ))}
    </ul>
  );
}
