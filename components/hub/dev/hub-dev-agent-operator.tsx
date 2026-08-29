"use client";

import { useState } from "react";
import {
  buildPlatformOperatorBrief,
  type PlatformOperatorBrief,
} from "@/lib/hub/dev/platform-operator-brief";
import type { OperatorDiff } from "@/lib/hub/dev/operator-diff";
import { HubDeployAgentChat } from "@/components/hub/deploy/hub-deploy-agent-chat";
import { HubDevOperatorDiffPanel } from "@/components/hub/dev/hub-dev-operator-diff-panel";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectIssue, DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { cn } from "@/lib/utils";

type OperatorTab = "chat" | "changes";

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
};

export function HubDevAgentOperator({
  draft,
  snapshot,
  testsPassed,
  executor,
  onApplyPatch,
  agentSeed,
  onSeedConsumed,
  fixing,
  publishReady,
  operatorDiff,
  onApplyDiff,
  onDismissDiff,
  onFixAll,
  onFixIssue,
  onPublish,
  onRunTests,
  onFocusAde,
}: HubDevAgentOperatorProps) {
  const brief = buildPlatformOperatorBrief(snapshot, { fixing });
  const [tab, setTab] = useState<OperatorTab>("chat");

  return (
    <div className="flex w-[340px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0e1014] xl:w-[380px]">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
          Platform Operator
        </p>
        <p className="text-[11px] text-[#b0b8c1]">Capability · Schema · Runtime · Publish</p>
      </div>

      <OperatorBriefCard
        brief={brief}
        publishReady={publishReady}
        onFixAll={onFixAll}
        onFixIssue={onFixIssue}
        onPublish={onPublish}
        onFocusAde={onFocusAde}
      />

      {operatorDiff ? (
        <HubDevOperatorDiffPanel
          diff={operatorDiff}
          onApply={onApplyDiff}
          onRunTest={onRunTests}
          onDismiss={onDismissDiff}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col border-t border-white/[0.06]">
        <div className="flex border-b border-white/[0.06]">
          <OperatorTabButton
            label="Chat"
            active={tab === "chat"}
            onClick={() => setTab("chat")}
          />
          <OperatorTabButton
            label={`Changes${snapshot.changesCount ? ` (${snapshot.changesCount})` : ""}`}
            active={tab === "changes"}
            onClick={() => setTab("changes")}
          />
        </div>

        {tab === "chat" ? (
          <HubDeployAgentChat
            mode="platform"
            draft={draft}
            testsPassed={testsPassed}
            executor={executor}
            onApplyPatch={onApplyPatch}
            seedUtterance={agentSeed}
            onSeedConsumed={onSeedConsumed}
          />
        ) : (
          <OperatorChangesList snapshot={snapshot} />
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/[0.06] p-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRunTests}
            className="flex-1 rounded-xl border border-white/[0.1] py-2 text-[12px] font-medium text-[#b0b8c1] hover:border-[#4593fc]/30"
          >
            Run Test
          </button>
          <button
            type="button"
            disabled={!publishReady && brief.primaryAction !== "publish"}
            onClick={onPublish}
            className={cn(
              "flex-1 rounded-xl py-2 text-[12px] font-semibold text-white",
              publishReady || brief.phase === "agent_ready"
                ? "bg-[#4593fc] hover:bg-[#3a82e0]"
                : "cursor-not-allowed bg-[#4593fc]/30",
            )}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function OperatorTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 px-3 py-1.5 text-[10px] font-semibold uppercase",
        active
          ? "border-b-2 border-[#4593fc] text-[#8ec0ff]"
          : "text-[#6b7684] hover:text-[#b0b8c1]",
      )}
    >
      {label}
    </button>
  );
}

function OperatorChangesList({ snapshot }: { snapshot: DevProjectSnapshot }) {
  if (snapshot.changes.length === 0) {
    return (
      <p className="p-4 text-[11px] text-[#6b7684]">No pending agent changes</p>
    );
  }
  return (
    <ul className="overflow-y-auto p-2 font-mono text-[10px] rimvio-scroll-touch">
      {snapshot.changes.map((ch) => (
        <li
          key={ch.id}
          className="rounded-lg border border-white/[0.06] bg-[#151820] px-2 py-1.5 text-[#b0b8c1]"
        >
          <span className={ch.kind === "add" ? "text-emerald-400" : "text-amber-400"}>
            {ch.kind === "add" ? "+" : "~"}
          </span>{" "}
          {ch.path}
        </li>
      ))}
    </ul>
  );
}

function OperatorBriefCard({
  brief,
  publishReady,
  onFixAll,
  onFixIssue,
  onPublish,
  onFocusAde,
}: {
  brief: PlatformOperatorBrief;
  publishReady: boolean;
  onFixAll: () => void;
  onFixIssue: (issue: DevProjectIssue) => void;
  onPublish: () => void;
  onFocusAde: () => void;
}) {
  return (
    <div className="shrink-0 space-y-2 px-3 py-3">
      <p className="text-[13px] font-semibold text-[#f2f4f6]">{brief.headline}</p>
      <ul className="space-y-0.5 text-[11px] text-[#b0b8c1]">
        {brief.bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {brief.issues.length > 0 ? (
        <ol className="mt-2 space-y-2">
          {brief.issues.map((issue, i) => (
            <li
              key={issue.id}
              className="rounded-lg border border-white/[0.08] bg-[#151820] px-2.5 py-2"
            >
              <p className="text-[11px] font-medium text-[#f2f4f6]">
                {i + 1}. {issue.title}
              </p>
              <p className="text-[10px] text-[#6b7684]">{issue.detail}</p>
              <button
                type="button"
                onClick={() => onFixIssue(issue)}
                className="mt-1.5 text-[10px] font-semibold text-[#8ec0ff] hover:underline"
              >
                Fix
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      {brief.primaryAction === "fix_all" ? (
        <button
          type="button"
          onClick={onFixAll}
          className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-[12px] font-semibold text-amber-400"
        >
          {brief.primaryLabel}
        </button>
      ) : null}
      {brief.primaryAction === "publish" && (publishReady || brief.phase === "agent_ready") ? (
        <button
          type="button"
          onClick={onPublish}
          className="w-full rounded-xl bg-emerald-500/15 py-2 text-[12px] font-semibold text-emerald-400"
        >
          {brief.primaryLabel}
        </button>
      ) : null}
      {brief.primaryAction === "connect" ? (
        <button
          type="button"
          onClick={onFocusAde}
          className="w-full rounded-xl bg-[#4593fc]/15 py-2 text-[12px] font-semibold text-[#8ec0ff]"
        >
          {brief.primaryLabel}
        </button>
      ) : null}

      {brief.phase === "fixing" ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-[82%] animate-pulse rounded-full bg-[#4593fc]" />
        </div>
      ) : null}
    </div>
  );
}
