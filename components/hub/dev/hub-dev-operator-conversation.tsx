"use client";

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import {
  HUB_DEPLOY_TARGET_SPECS,
  type HubDeployTarget,
} from "@/lib/hub/dev/hub-deploy-targets";
import type { OperatorConversationEntry } from "@/lib/hub/dev/operator-conversation";
import type { DevProjectChange, DevProjectIssue } from "@/lib/hub/dev/dev-project-state";
import { HubDevOperatorDiffPanel } from "@/components/hub/dev/hub-dev-operator-diff-panel";
import { cn } from "@/lib/utils";

type HubDevOperatorConversationProps = {
  readonly entries: readonly OperatorConversationEntry[];
  readonly showGreeting: boolean;
  readonly onFixIssue: (issue: DevProjectIssue) => void;
  readonly onReviewAll: () => void;
  readonly onApplyDiff: () => void;
  readonly onRunTests: () => void;
  readonly onDismissDiff: () => void;
  readonly onAskUserAction?: (actionId: string) => void;
  readonly onPreview?: () => void;
  readonly onPublish?: () => void;
};

const GREETING =
  "OsakaStay Platform Builder에 오신 것을 환영합니다. Platform 분석 · 수정 · 테스트 · Publish까지 도와드릴게요.";

export function HubDevOperatorConversation({
  entries,
  showGreeting,
  onFixIssue,
  onReviewAll,
  onApplyDiff,
  onRunTests,
  onDismissDiff,
  onAskUserAction,
  onPreview,
  onPublish,
}: HubDevOperatorConversationProps) {
  const hasContent = entries.length > 0 || showGreeting;

  if (!hasContent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
          A
        </div>
        <p className="mt-3 text-[10px] font-medium text-[#6b7280]">Platform Operator</p>
        <p className="mt-1 max-w-[220px] text-[9px] leading-relaxed text-[#9ca3af]">
          다음 작업을 알려주세요. Plan → Execute → Verify 순으로 진행합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {showGreeting ? <GreetingTurn body={GREETING} /> : null}
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
            onAskUserAction={onAskUserAction}
            onPreview={onPreview}
            onPublish={onPublish}
          />
        ),
      )}
    </div>
  );
}

function GreetingTurn({ body }: { body: string }) {
  return (
    <div className="flex gap-2">
      <AgentAvatar />
      <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[10px] leading-relaxed text-[#374151] shadow-sm">
        {body}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-2xl rounded-br-md bg-violet-600 px-3 py-2 text-[10px] leading-relaxed text-white shadow-sm">
        {text}
      </div>
    </div>
  );
}

function AgentAvatar() {
  return (
    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
      A
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
  onAskUserAction,
  onPreview,
  onPublish,
}: {
  entry: Extract<OperatorConversationEntry, { kind: "agent" }>;
  onFixIssue: (issue: DevProjectIssue) => void;
  onReviewAll: () => void;
  onApplyDiff: () => void;
  onRunTests: () => void;
  onDismissDiff: () => void;
  onAskUserAction?: (actionId: string) => void;
  onPreview?: () => void;
  onPublish?: () => void;
}) {
  const { payload } = entry;

  return (
    <div className="flex gap-2">
      <AgentAvatar />
      <div className="min-w-0 flex-1 space-y-2">
        {payload.type === "planning" ? (
          <PlanningBlock title={payload.title} items={payload.items} />
        ) : null}
        {payload.type === "observe" ? (
          <ObserveBlock lines={payload.lines} />
        ) : null}
        {payload.type === "text" ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[10px] leading-relaxed text-[#374151] shadow-sm">
            {payload.body}
          </div>
        ) : null}
        {payload.type === "thought" ? (
          <ThoughtBlock title={payload.title} body={payload.body} />
        ) : null}
        {payload.type === "terminal" ? (
          <TerminalBlock title={payload.title} lines={payload.lines} waiting={payload.waiting} />
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
          <HubDevOperatorDiffPanel diff={payload.diff} onApply={onApplyDiff} variant="inline" />
        ) : null}
        {payload.type === "testResult" ? (
          <TestResultBlock passed={payload.passed} total={payload.total} running={payload.running} />
        ) : null}
        {payload.type === "verify" ? (
          <VerifyBlock ok={payload.ok} detail={payload.detail} />
        ) : null}
        {payload.type === "askUser" && payload.actionId === "choose_deploy_targets" ? (
          <DeployTargetAskBlock message={payload.message} onAction={onAskUserAction} />
        ) : payload.type === "askUser" ? (
          <AskUserBlock
            message={payload.message}
            actionLabel={payload.actionLabel}
            actionId={payload.actionId}
            publishGate={payload.publishGate}
            onAction={onAskUserAction}
          />
        ) : null}
        {payload.type === "complete" ? (
          <CompleteBlock
            summary={payload.summary}
            onPreview={onPreview ?? onRunTests}
            onPublish={onPublish}
          />
        ) : null}
        {payload.type === "finalReport" ? (
          <FinalReportBlock
            report={payload.report}
            onPreview={onPreview ?? onRunTests}
            onRunTests={onRunTests}
            onPublish={onPublish}
          />
        ) : null}
      </div>
    </div>
  );
}

function PlanningBlock({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; status: "done" | "running" | "pending" }[];
}) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold text-violet-800">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-[9px] text-[#4b5563]">
            {item.status === "done" ? (
              <Check className="size-3 text-emerald-500" />
            ) : item.status === "running" ? (
              <Loader2 className="size-3 animate-spin text-violet-600" />
            ) : (
              <span className="size-3 rounded-full border border-[#d1d5db]" />
            )}
            <span className={item.status === "running" ? "font-medium text-violet-700" : ""}>{item.label}</span>
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
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm">
        <p className="text-[10px] font-semibold text-[#111827]">{headline}</p>
        <ul className="mt-1.5 space-y-0.5">
          {bullets
            .filter((line) => !line.startsWith("⚠"))
            .map((line) => (
              <li key={line} className="flex items-start gap-1.5 text-[9px] leading-snug text-[#4b5563]">
                <Check className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                <span>{line.replace(/^✓\s*/, "")}</span>
              </li>
            ))}
        </ul>
      </div>

      {issues.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-2.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold text-red-700">
            <AlertTriangle className="size-3" />
            Analysis result: {issues.length} issues found
          </p>
          <ul className="mt-2 space-y-1.5">
            {issues.slice(0, 4).map((issue) => (
              <IssueRow key={issue.id} issue={issue} onFix={() => onFixIssue(issue)} />
            ))}
          </ul>
        </div>
      ) : null}

      {changes.length > 0 ? (
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold text-[#374151]">Proposed Changes ({changesCount})</p>
            <button type="button" onClick={onReviewAll} className="text-[8px] font-semibold text-violet-600 hover:underline">
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
    <li className="flex items-center gap-2 rounded-lg border border-white/80 bg-white px-2 py-1.5 shadow-sm">
      <span className={cn("size-2 shrink-0 rounded-full", isHigh ? "bg-red-500" : "bg-amber-400")} />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[9px] font-semibold text-[#111827]">{issue.title}</p>
        <p className="text-[8px] text-[#6b7280]">{issue.detail}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded px-1 py-px text-[7px] font-bold uppercase",
          isHigh ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
        )}
      >
        {isHigh ? "High" : "Medium"}
      </span>
      <button
        type="button"
        onClick={onFix}
        className="shrink-0 rounded-md border border-[#e5e7eb] bg-white px-2 py-0.5 text-[8px] font-semibold text-[#374151] hover:border-violet-200 hover:text-violet-700"
      >
        Fix
      </button>
    </li>
  );
}

function ObserveBlock({ lines }: { lines: readonly string[] }) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 shadow-sm">
      <ul className="space-y-0.5">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-1.5 text-[9px] text-[#4b5563]">
            <Check className="mt-0.5 size-3 shrink-0 text-emerald-500" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerifyBlock({ ok, detail }: { ok: boolean; detail: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-[9px] font-medium", ok ? "text-emerald-600" : "text-amber-600")}>
      {ok ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      Verify: {detail}
    </p>
  );
}

function ThoughtBlock({ title, body }: { title: string; body?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 text-left text-[10px] font-medium text-[#6b7280]"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {title}
      </button>
      {open && body ? <p className="mt-1.5 text-[10px] leading-relaxed text-[#9ca3af]">{body}</p> : null}
    </div>
  );
}

function TerminalBlock({
  title,
  lines,
  waiting,
}: {
  title: string;
  lines: readonly string[];
  waiting?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#111827] shadow-sm">
      <p className="flex items-center gap-1.5 border-b border-white/10 px-3 py-1.5 font-mono text-[9px] text-[#9ca3af]">
        <span className="text-[#6b7280]">&gt;_</span>
        {title}
      </p>
      <div className="max-h-[180px] overflow-y-auto px-3 py-2 font-mono text-[9px] leading-relaxed text-[#d1d5db] rimvio-scroll-touch">
        {lines.map((line, i) => (
          <p key={`${i}-${line}`}>{line}</p>
        ))}
        {waiting ? (
          <p className="mt-1 animate-pulse text-[#a78bfa]">{waiting}</p>
        ) : null}
      </div>
    </div>
  );
}

function DeployTargetAskBlock({
  message,
  onAction,
}: {
  message: string;
  onAction?: (actionId: string) => void;
}) {
  const [selected, setSelected] = useState<HubDeployTarget[]>(["personal"]);

  const toggle = (id: HubDeployTarget) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium text-[#92400e]">{message}</p>
      <ul className="mt-2 space-y-1.5">
        {HUB_DEPLOY_TARGET_SPECS.map((spec) => {
          const checked = selected.includes(spec.id);
          return (
            <li key={spec.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-white/70 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(spec.id)}
                  className="mt-0.5 size-3.5 accent-violet-600"
                />
                <span>
                  <span className="block text-[11px] font-semibold text-[#111827]">{spec.labelKo}</span>
                  <span className="block text-[9px] text-[#6b7280]">{spec.hintKo}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={selected.length === 0}
        onClick={() => onAction?.(`confirm_deploy:${selected.join(",")}`)}
        className="mt-2 rounded-lg bg-violet-600 px-3 py-1 text-[9px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
      >
        배포 시작
      </button>
    </div>
  );
}

function AskUserBlock({
  message,
  actionLabel,
  actionId,
  publishGate,
  onAction,
}: {
  message: string;
  actionLabel: string;
  actionId: string;
  publishGate?: import("@/lib/hub/dev/hub-publish-flow").PublishGateResult;
  onAction?: (actionId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 shadow-sm">
      <p className="text-[10px] font-medium text-[#92400e]">{message}</p>
      {publishGate ? (
        <ul className="mt-2 space-y-0.5 text-[9px] text-[#78350f]">
          <li>
            Platform: {publishGate.platformName} · {publishGate.registeredCount} capabilities
          </li>
          <li>Index v2 gate: {publishGate.ok ? "pass" : "blocked"}</li>
          {publishGate.rejected.map((r) => (
            <li key={r.capabilityId} className="text-red-700">
              {r.capabilityId}: {r.errorKo}
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={() => onAction?.(actionId)}
        className="mt-2 rounded-lg bg-violet-600 px-3 py-1 text-[9px] font-semibold text-white hover:bg-violet-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function FinalReportBlock({
  report,
  onPreview,
  onRunTests,
  onPublish,
}: {
  report: import("@/lib/agent-os/agent-turn/types").AgentFinalReport;
  onPreview: () => void;
  onRunTests: () => void;
  onPublish?: () => void;
}) {
  const handleNext = (id: string) => {
    if (id === "run_tests") onRunTests();
    else if (id === "open_preview" || id === "resume") onPreview();
    else if (id === "connect_payment") onPublish?.();
    else onPreview();
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold text-emerald-800">{report.headlineKo}</p>
      {report.completed.length > 0 ? (
        <div className="mt-2">
          <p className="text-[9px] font-semibold text-[#6b7280]">완료</p>
          <ul className="mt-1 space-y-0.5">
            {report.completed.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[9px] text-[#374151]">
                <Check className="size-3 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.verification.length > 0 ? (
        <div className="mt-2">
          <p className="text-[9px] font-semibold text-[#6b7280]">검증</p>
          <ul className="mt-1 space-y-0.5">
            {report.verification.map((item) => (
              <li key={item.labelKo} className="flex items-center gap-1.5 text-[9px] text-[#374151]">
                {item.passed ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <span className="size-3 rounded-full border border-[#d1d5db]" />
                )}
                {item.labelKo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.cautions.length > 0 ? (
        <div className="mt-2">
          <p className="text-[9px] font-semibold text-amber-700">주의</p>
          <ul className="mt-1 space-y-0.5">
            {report.cautions.map((item) => (
              <li key={item} className="text-[9px] text-[#92400e]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.nextActions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {report.nextActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleNext(action.id)}
              className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-[9px] font-semibold text-[#374151] hover:border-violet-200"
            >
              {action.labelKo}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CompleteBlock({
  summary,
  onPreview,
  onPublish,
}: {
  summary: string;
  onPreview: () => void;
  onPublish?: () => void;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 shadow-sm">
      <p className="text-[10px] font-medium text-emerald-800">{summary}</p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={onPreview}
          className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-[9px] font-semibold text-[#374151] hover:border-violet-200"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="rounded-lg bg-violet-600 px-2.5 py-1 text-[9px] font-semibold text-white hover:bg-violet-700"
        >
          Publish
        </button>
      </div>
    </div>
  );
}

function TestResultBlock({
  passed,
  total,
  running,
}: {
  passed: number;
  total: number;
  running?: boolean;
}) {
  if (running) {
    return (
      <p className="flex items-center gap-1.5 text-[9px] text-[#6b7280]">
        <Loader2 className="size-3 animate-spin text-violet-600" />
        Changes applied. Running tests…
      </p>
    );
  }
  const ok = passed === total && total > 0;
  return (
    <p className={cn("flex items-center gap-1.5 text-[9px] font-medium", ok ? "text-emerald-600" : "text-amber-600")}>
      {ok ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      Running tests… {passed}/{total} passed
    </p>
  );
}
