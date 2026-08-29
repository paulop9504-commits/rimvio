"use client";

import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import type { OperatorConversationEntry } from "@/lib/hub/dev/operator-conversation";
import type { DevProjectChange, DevProjectIssue } from "@/lib/hub/dev/dev-project-state";
import { HubDevOperatorDiffPanel } from "@/components/hub/dev/hub-dev-operator-diff-panel";
import { cn } from "@/lib/utils";

type HubDevOperatorConversationProps = {
  readonly entries: readonly OperatorConversationEntry[];
  readonly onFixIssue: (issue: DevProjectIssue) => void;
  readonly onReviewAll: () => void;
  readonly onApplyDiff: () => void;
  readonly onRunTests: () => void;
  readonly onDismissDiff: () => void;
};

export function HubDevOperatorConversation({
  entries,
  onFixIssue,
  onReviewAll,
  onApplyDiff,
  onRunTests,
  onDismissDiff,
}: HubDevOperatorConversationProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
          A
        </div>
        <p className="mt-3 text-[10px] font-medium text-[#6b7280]">Platform Operator</p>
        <p className="mt-1 max-w-[200px] text-[9px] leading-relaxed text-[#9ca3af]">
          무엇을 만들까요? 아래에 명령을 입력하면 Plan → Execute → Verify가 시작됩니다.
        </p>
        <p className="mt-2 text-[8px] text-[#d1d5db]">예: 오사카 호텔 플랫폼 만들어줘</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 p-2.5">
      {entries.map((entry) =>
        entry.kind === "user" ? (
          <UserBubble key={entry.id} text={entry.text} />
        ) : (
          <AgentTurn
            key={entry.id}
            entry={entry}
            onFixIssue={onFixIssue}
            onReviewAll={onReviewAll}
            onApplyDiff={onApplyDiff}
            onRunTests={onRunTests}
            onDismissDiff={onDismissDiff}
          />
        ),
      )}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-xl rounded-br-sm bg-violet-600 px-2.5 py-1.5 text-[10px] leading-relaxed text-white shadow-sm">
        {text}
      </div>
    </div>
  );
}

function AgentTurn({
  entry,
  onFixIssue,
  onReviewAll,
  onApplyDiff,
  onRunTests,
  onDismissDiff,
}: {
  entry: Extract<OperatorConversationEntry, { kind: "agent" }>;
  onFixIssue: (issue: DevProjectIssue) => void;
  onReviewAll: () => void;
  onApplyDiff: () => void;
  onRunTests: () => void;
  onDismissDiff: () => void;
}) {
  const { payload } = entry;

  return (
    <div className="flex gap-2">
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
        A
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {payload.type === "working" ? <WorkingBlock steps={payload.steps} /> : null}
        {payload.type === "text" ? (
          <div className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-2 text-[10px] leading-relaxed text-[#374151] shadow-sm">
            {payload.body}
          </div>
        ) : null}
        {payload.type === "analysis" ? (
          <AnalysisBlock
            headline={payload.headline}
            bullets={payload.bullets}
            issues={payload.issues}
            changes={payload.changes}
            changesCount={payload.changesCount}
            onFixIssue={onFixIssue}
            onReviewAll={onReviewAll}
          />
        ) : null}
        {payload.type === "diff" ? (
          <HubDevOperatorDiffPanel
            diff={payload.diff}
            onApply={onApplyDiff}
            onRunTest={onRunTests}
            onDismiss={onDismissDiff}
          />
        ) : null}
      </div>
    </div>
  );
}

function WorkingBlock({ steps }: { steps: readonly string[] }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-2 shadow-sm">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-700">
        <Loader2 className="size-3 animate-spin" />
        Working…
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {steps.map((step) => (
          <li key={step} className="text-[8px] text-[#6b7280]">
            · {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisBlock({
  headline,
  bullets,
  issues,
  changes,
  changesCount,
  onFixIssue,
  onReviewAll,
}: {
  headline: string;
  bullets: readonly string[];
  issues: readonly DevProjectIssue[];
  changes: readonly DevProjectChange[];
  changesCount: number;
  onFixIssue: (issue: DevProjectIssue) => void;
  onReviewAll: () => void;
}) {
  const visibleChanges = changes.slice(0, 5);
  const moreChanges = Math.max(0, changes.length - visibleChanges.length);

  return (
    <>
      <div className="rounded-lg border border-[#e5e7eb] bg-white p-2 shadow-sm">
        <p className="text-[10px] font-semibold text-[#111827]">{headline}</p>
        <ul className="mt-1 space-y-0.5">
          {bullets
            .filter((line) => !line.startsWith("⚠"))
            .map((line) => (
              <li key={line} className="flex items-start gap-1 text-[9px] leading-snug text-[#4b5563]">
                <span className="text-emerald-500">✓</span>
                <span>{line.replace(/^✓\s*/, "")}</span>
              </li>
            ))}
        </ul>
      </div>

      {issues.length > 0 ? (
        <div>
          <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-amber-700">
            <AlertTriangle className="size-2.5" />
            {issues.length} issues detected
          </p>
          <ul className="space-y-1">
            {issues.slice(0, 4).map((issue) => (
              <IssueRow key={issue.id} issue={issue} onFix={() => onFixIssue(issue)} />
            ))}
          </ul>
        </div>
      ) : null}

      {changes.length > 0 ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold text-[#374151]">Proposed Changes ({changesCount})</p>
            <button
              type="button"
              onClick={onReviewAll}
              className="text-[8px] font-semibold text-violet-600 hover:underline"
            >
              Review All
            </button>
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {visibleChanges.map((ch) => (
              <li key={ch.id} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-[#f9fafb]">
                <span
                  className={cn(
                    "w-2 shrink-0 text-center font-mono text-[9px] font-bold",
                    ch.kind === "add" ? "text-emerald-600" : "text-cyan-600",
                  )}
                >
                  {ch.kind === "add" ? "+" : "~"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-[#4b5563]">{ch.summary}</span>
                <ChevronRight className="size-2.5 shrink-0 text-[#d1d5db]" />
              </li>
            ))}
          </ul>
          {moreChanges > 0 ? (
            <p className="mt-1 pl-3 text-[8px] text-[#9ca3af]">…+ {moreChanges} more changes</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function IssueRow({ issue, onFix }: { issue: DevProjectIssue; onFix: () => void }) {
  const isHigh = issue.severity === "error";
  return (
    <li className="flex items-start gap-1.5 rounded-md border border-[#eef0f3] bg-[#fafafa] px-2 py-1.5">
      <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", isHigh ? "bg-red-500" : "bg-amber-400")} />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[9px] font-semibold leading-tight text-[#111827]">{issue.title}</p>
        <p className="text-[8px] leading-snug text-[#6b7280]">{issue.detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            "rounded px-1 py-px text-[7px] font-bold uppercase",
            isHigh ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
          )}
        >
          {isHigh ? "High" : "Medium"}
        </span>
        <button
          type="button"
          onClick={onFix}
          className="rounded border border-[#e5e7eb] bg-white px-1.5 py-px text-[8px] font-semibold text-[#374151] shadow-sm hover:border-violet-200 hover:text-violet-700"
        >
          Fix
        </button>
      </div>
    </li>
  );
}
