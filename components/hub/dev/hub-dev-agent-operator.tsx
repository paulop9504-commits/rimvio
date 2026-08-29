"use client";

import { useState } from "react";
import { ChevronRight, Paperclip, Send, Sparkles } from "lucide-react";
import {
  buildPlatformOperatorBrief,
  type PlatformOperatorBrief,
} from "@/lib/hub/dev/platform-operator-brief";
import type { OperatorDiff } from "@/lib/hub/dev/operator-diff";
import { HubDeployAgentChat } from "@/components/hub/deploy/hub-deploy-agent-chat";
import { HubDevOperatorDiffPanel } from "@/components/hub/dev/hub-dev-operator-diff-panel";
import { HubDevSandboxPreview } from "@/components/hub/dev/hub-dev-sandbox-preview";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectIssue, DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { cn } from "@/lib/utils";

type OperatorTab = "chat" | "changes" | "terminal" | "activity";

type HubDevAgentOperatorProps = {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly testsPassed: boolean;
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

export function HubDevAgentOperator(props: HubDevAgentOperatorProps) {
  const brief = buildPlatformOperatorBrief(props.snapshot, { fixing: props.fixing });
  const [tab, setTab] = useState<OperatorTab>("chat");
  const [chatInput, setChatInput] = useState("");

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    props.onAskOperator(text);
    setChatInput("");
    setTab("chat");
  };

  return (
    <div className="flex w-[360px] shrink-0 flex-col border-l border-[#e5e7eb] bg-white xl:w-[400px]">
      <div className="border-b border-[#f3f4f6] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-bold text-[#111827]">Platform Operator</p>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700">AI</span>
            </div>
            <p className="text-[11px] text-[#9ca3af]">Claude 3.5 Sonnet</p>
          </div>
          <Sparkles className="size-4 text-violet-500" />
        </div>
        <div className="mt-2 flex gap-1 border-b border-[#f3f4f6]">
          {(
            [
              ["chat", "Chat"],
              ["changes", `Changes${props.snapshot.changesCount ? ` (${props.snapshot.changesCount})` : ""}`],
              ["terminal", "Terminal"],
              ["activity", "Activity"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide",
                tab === id
                  ? "border-b-2 border-violet-600 text-violet-700"
                  : "text-[#9ca3af] hover:text-[#6b7280]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rimvio-scroll-touch">
        {tab === "chat" ? (
          <>
            <OperatorAnalysisCard brief={brief} snapshot={props.snapshot} onFixAll={props.onFixAll} onFixIssue={props.onFixIssue} onPublish={props.onPublish} publishReady={props.publishReady} onFocusAde={props.onFocusAde} />
            {props.operatorDiff ? (
              <HubDevOperatorDiffPanel diff={props.operatorDiff} onApply={props.onApplyDiff} onRunTest={props.onRunTests} onDismiss={props.onDismissDiff} />
            ) : null}
            <ProposedChangesList snapshot={props.snapshot} onReviewAll={props.onReviewAllChanges} />
            <div className="min-h-[160px] border-t border-[#f3f4f6]">
              <HubDeployAgentChat
                mode="platform"
                draft={props.draft}
                testsPassed={props.testsPassed}
                executor={props.executor}
                onApplyPatch={props.onApplyPatch}
                seedUtterance={props.agentSeed}
                onSeedConsumed={props.onSeedConsumed}
              />
            </div>
          </>
        ) : null}
        {tab === "changes" ? <ChangesTab snapshot={props.snapshot} /> : null}
        {tab === "terminal" ? <TerminalTab /> : null}
        {tab === "activity" ? <ActivityTab snapshot={props.snapshot} /> : null}
      </div>

      <div className="border-t border-[#e5e7eb] p-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
            placeholder="Ask Operator anything…"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[#374151] placeholder:text-[#9ca3af] focus:outline-none"
          />
          <button type="button" className="text-[#9ca3af] hover:text-[#6b7280]"><Paperclip className="size-4" /></button>
          <button type="button" onClick={sendChat} disabled={!chatInput.trim()} className="rounded-lg bg-violet-600 p-1.5 text-white disabled:opacity-40"><Send className="size-3.5" /></button>
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={props.onRunTests} className="flex-1 rounded-xl border border-[#e5e7eb] py-2 text-[11px] font-medium text-[#374151]">Run Test</button>
          <button type="button" disabled={!props.publishReady} onClick={props.onPublish} className="flex-1 rounded-xl bg-violet-600 py-2 text-[11px] font-semibold text-white disabled:opacity-40">Publish</button>
        </div>
      </div>

      <HubDevSandboxPreview draft={props.draft} />
    </div>
  );
}

function OperatorAnalysisCard({ brief, snapshot, onFixAll, onFixIssue, onPublish, publishReady, onFocusAde }: { brief: PlatformOperatorBrief; snapshot: DevProjectSnapshot; onFixAll: () => void; onFixIssue: (issue: DevProjectIssue) => void; onPublish: () => void; publishReady: boolean; onFocusAde: () => void }) {
  return (
    <div className="space-y-3 p-4">
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-3">
        <p className="text-[12px] font-semibold text-[#111827]">{brief.headline}</p>
        <ul className="mt-2 space-y-1 text-[11px] text-[#4b5563]">
          {brief.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {snapshot.issuesCount > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
            {snapshot.issuesCount} issues detected
          </p>
          <ul className="mt-2 space-y-2">
            {snapshot.issues.slice(0, 4).map((issue) => (
              <li key={issue.id} className={cn("rounded-xl border p-3", issue.severity === "error" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] font-semibold text-[#111827]">{issue.title}</p>
                    <p className="mt-0.5 text-[10px] text-[#6b7280]">{issue.detail}</p>
                    <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", issue.severity === "error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")}>
                      {issue.severity === "error" ? "High" : "Medium"}
                    </span>
                  </div>
                  <button type="button" onClick={() => onFixIssue(issue)} className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700 shadow-sm ring-1 ring-[#e5e7eb]">
                    Fix
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief.primaryAction === "fix_all" ? (
        <button type="button" onClick={onFixAll} className="w-full rounded-xl bg-amber-500 py-2.5 text-[12px] font-semibold text-white">Fix all</button>
      ) : null}
      {brief.primaryAction === "connect" ? (
        <button type="button" onClick={onFocusAde} className="w-full rounded-xl bg-violet-100 py-2.5 text-[12px] font-semibold text-violet-700">Connect source</button>
      ) : null}
      {brief.primaryAction === "publish" && publishReady ? (
        <button type="button" onClick={onPublish} className="w-full rounded-xl bg-emerald-600 py-2.5 text-[12px] font-semibold text-white">Publish</button>
      ) : null}
    </div>
  );
}

function ProposedChangesList({ snapshot, onReviewAll }: { snapshot: DevProjectSnapshot; onReviewAll: () => void }) {
  if (snapshot.changes.length === 0) return null;
  return (
    <div className="border-t border-[#f3f4f6] px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">Proposed Changes</p>
        <button type="button" onClick={onReviewAll} className="text-[10px] font-semibold text-violet-600 hover:underline">
          Review All
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {snapshot.changes.slice(0, 5).map((ch) => (
          <li key={ch.id} className="flex items-center gap-2 rounded-lg border border-[#f3f4f6] bg-white px-2.5 py-2">
            <span className={cn("font-mono text-[10px]", ch.kind === "add" ? "text-emerald-600" : "text-amber-600")}>
              {ch.kind === "add" ? "+" : "~"}
            </span>
            <span className="min-w-0 flex-1 truncate text-[10px] text-[#4b5563]">{ch.summary}</span>
            <ChevronRight className="size-3 shrink-0 text-[#d1d5db]" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangesTab({ snapshot }: { snapshot: DevProjectSnapshot }) {
  return (
    <ul className="space-y-1 p-3 font-mono text-[10px]">
      {snapshot.changes.map((ch) => (
        <li key={ch.id} className="rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-[#4b5563]">
          {ch.kind === "add" ? "+" : "~"} {ch.path}
        </li>
      ))}
    </ul>
  );
}

function TerminalTab() {
  return (
    <div className="bg-[#1e1e1e] p-3 font-mono text-[10px] leading-relaxed text-emerald-400">
      <p>$ rimvio test --platform osaka-stay</p>
      <p className="text-[#9ca3af]">Running capability sandbox…</p>
      <p>✓ hotel.search</p>
      <p>✓ booking.confirm</p>
      <p className="text-amber-400">⚠ payment.commit — approval policy</p>
    </div>
  );
}

function ActivityTab({ snapshot }: { snapshot: DevProjectSnapshot }) {
  return (
    <ul className="space-y-2 p-4">
      {snapshot.activities.map((a) => (
        <li key={a.id} className="flex items-center gap-2 text-[11px] text-[#4b5563]">
          <span className={cn("size-2 rounded-full", a.status === "done" ? "bg-emerald-500" : a.status === "warning" ? "bg-amber-500" : "bg-[#d1d5db]")} />
          {a.label}
        </li>
      ))}
    </ul>
  );
}
