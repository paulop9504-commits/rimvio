"use client";

import { useCallback, useRef, useState } from "react";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type {
  DevProjectSnapshot,
  DevProjectIssue,
  DevProjectChange,
  DevProjectSource,
  DevChangeReviewState,
} from "@/lib/hub/dev/dev-project-state";
import type { AnalyzedPlatformBlueprint } from "@/lib/hub/dev/platform-analyzer";
import type { DevWorkspacePane } from "@/lib/hub/dev/dev-workspace-nav";
import { cn } from "@/lib/utils";
import { HubDevCapabilityList } from "@/components/hub/dev/hub-dev-capability-view";
import { HubDevAgentSimulation } from "@/components/hub/dev/hub-dev-agent-simulation";
import { HubDevPublishPanel } from "@/components/hub/dev/hub-dev-publish-panel";
import { HubDevVersionsPanel } from "@/components/hub/dev/hub-dev-versions-panel";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import type { HubPublishOptions } from "@/lib/hub/dev/hub-publish-model";
import { HubDevAdeWorkbench } from "@/components/hub/dev/hub-dev-ade-workbench";

type HubDevCenterPaneProps = {
  readonly pane: DevWorkspacePane;
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly selectedCapabilityId: string | null;
  readonly testsPassed: boolean;
  readonly analyzing: boolean;
  readonly blueprint: AnalyzedPlatformBlueprint | null;
  readonly connectedSource: DevProjectSource | null;
  readonly analyzedAtMs: number | null;
  readonly connectValue: string;
  readonly onConnectValueChange: (v: string) => void;
  readonly onConnect: () => void;
  readonly onFilesDrop: (files: FileList) => void;
  readonly onSelectCapability: (id: string) => void;
  readonly onFixIssue: (issue: DevProjectIssue) => void;
  readonly onPublish: (opts?: HubPublishOptions) => void;
  readonly wizard: HubCapabilityWizard;
  readonly publishStatus: string;
  readonly onTestComplete: (passed: boolean) => void;
  readonly changeReview: Readonly<Record<string, DevChangeReviewState>>;
  readonly onAcceptAllChanges: () => void;
  readonly onRejectChange: (changeId: string) => void;
  readonly onReviewChanges: () => void;
  readonly onTestInvoke: (capabilityId: string) => void;
};

export function HubDevCenterPane(props: HubDevCenterPaneProps) {
  switch (props.pane) {
    case "ade":
      return <HubDevAdeWorkbench {...props} />;
    case "sources":
      return (
        <SourcesPane
          sources={props.snapshot.sources}
          files={props.snapshot.files}
          onDrop={props.onFilesDrop}
        />
      );
    case "issues":
      return <IssuesPane issues={props.snapshot.issues} onFix={props.onFixIssue} />;
    case "changes":
      return (
        <ChangesPane
          changes={props.snapshot.changes}
          changeReview={props.changeReview}
          onAcceptAll={props.onAcceptAllChanges}
          onReject={props.onRejectChange}
          onReview={props.onReviewChanges}
        />
      );
    case "status":
      return <StatusPane snapshot={props.snapshot} onPublish={() => props.onPublish()} />;
    case "capabilities":
      return (
        <HubDevCapabilityList
          draft={props.draft}
          actions={props.draft.actions}
          selectedId={props.selectedCapabilityId}
          testsPassed={props.testsPassed}
          onSelect={props.onSelectCapability}
          onViewConfiguration={props.onSelectCapability}
          onTest={() => props.onTestComplete(false)}
          onEditWithAi={() => {}}
          onOpenCode={() => {
            if (props.selectedCapabilityId) props.onSelectCapability(props.selectedCapabilityId);
          }}
        />
      );
    case "tests":
      return (
        <HubDevAgentSimulation draft={props.draft} onComplete={props.onTestComplete} />
      );
    case "deploy":
      return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
          <div className="mx-auto max-w-3xl">
            <HubDevPublishPanel wizard={props.wizard as never} onPublish={props.onPublish} />
          </div>
        </div>
      );
    case "versions":
      return (
        <HubDevVersionsPanel
          draft={props.draft}
          publishStatus={props.publishStatus as "idle"}
        />
      );
    default:
      return <HubDevAdeWorkbench {...props} />;
  }
}

function SourcesPane({
  sources,
  files,
  onDrop,
}: {
  sources: readonly DevProjectSource[];
  files: DevProjectSnapshot["files"];
  onDrop: (files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="overflow-y-auto p-4 rimvio-scroll-touch">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-[#b0b8c1]">Sources</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[11px] text-[#8ec0ff] hover:underline"
        >
          Add file
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onDrop(e.target.files)}
        />
      </div>

      {sources.length > 0 ? (
        <ul className="mb-4 space-y-1">
          {sources.map((src) => (
            <li
              key={src.id}
              className="rounded-lg border border-[#4593fc]/20 bg-[#4593fc]/5 px-3 py-2 text-[11px] text-[#b0b8c1]"
            >
              <span className="mr-2 text-[10px] uppercase text-[#8ec0ff]">{src.kind}</span>
              {src.label}
              {src.detail ? (
                <span className="mt-0.5 block truncate text-[10px] text-[#6b7684]">
                  {src.detail}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-[11px] text-[#6b7684]">연결된 source 없음 — ADE에서 Connect</p>
      )}

      {files.length > 0 ? (
        <>
          <p className="mb-2 text-[10px] font-semibold uppercase text-[#4b5563]">Derived files</p>
          <ul className="space-y-1">
            {files.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-white/[0.06] bg-[#151820] px-3 py-2 font-mono text-[11px] text-[#b0b8c1]"
              >
                {f.path}
                <span className="ml-2 text-[10px] text-[#6b7684]">{f.kind}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function IssuesPane({
  issues,
  onFix,
}: {
  issues: readonly DevProjectIssue[];
  onFix: (issue: DevProjectIssue) => void;
}) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-emerald-400">
        ✓ No issues
      </div>
    );
  }
  return (
    <div className="overflow-y-auto p-4 rimvio-scroll-touch">
      <p className="mb-3 text-[12px] text-[#6b7684]">
        {issues.filter((i) => i.severity === "error").length} errors ·{" "}
        {issues.filter((i) => i.severity === "warning").length} warnings
      </p>
      <ul className="space-y-3">
        {issues.map((issue) => (
          <li
            key={issue.id}
            className="rounded-xl border border-white/[0.08] bg-[#151820] p-4"
          >
            <p className="text-[12px] font-semibold text-[#f2f4f6]">
              {issue.severity === "error" ? "🔴" : "🟡"} {issue.title}
            </p>
            <p className="mt-1 text-[11px] text-[#6b7684]">{issue.detail}</p>
            <button
              type="button"
              onClick={() => onFix(issue)}
              className="mt-3 rounded-lg bg-[#4593fc]/15 px-3 py-1.5 text-[11px] font-semibold text-[#8ec0ff] hover:bg-[#4593fc]/25"
            >
              Fix automatically
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangesPane({
  changes,
  changeReview,
  onAcceptAll,
  onReject,
  onReview,
}: {
  changes: readonly DevProjectChange[];
  changeReview: Readonly<Record<string, DevChangeReviewState>>;
  onAcceptAll: () => void;
  onReject: (changeId: string) => void;
  onReview: () => void;
}) {
  const [reviewMode, setReviewMode] = useState(false);
  const pending = changes.filter((ch) => (changeReview[ch.id] ?? "pending") === "pending");
  const accepted = changes.filter((ch) => changeReview[ch.id] === "accepted");

  if (changes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-[#6b7684]">
        Agent changes appear here after analyze
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-4 rimvio-scroll-touch">
      <p className="mb-1 text-[12px] font-semibold text-[#b0b8c1]">Agent Changes</p>
      <p className="mb-3 text-[11px] text-[#6b7684]">
        {pending.length} pending · {accepted.length} accepted
      </p>
      <ul className="space-y-1 font-mono text-[11px]">
        {(reviewMode ? pending : changes.filter((ch) => changeReview[ch.id] !== "rejected")).map(
          (ch) => {
            const state = changeReview[ch.id] ?? "pending";
            return (
              <li
                key={ch.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#151820] px-3 py-2 text-[#b0b8c1]",
                  state === "accepted" && "opacity-60",
                )}
              >
                <span className="truncate">
                  <span className={ch.kind === "add" ? "text-emerald-400" : "text-amber-400"}>
                    {ch.kind === "add" ? "+" : "~"}
                  </span>{" "}
                  {ch.path}
                </span>
                <span className="ml-2 shrink-0 text-[10px] text-[#6b7684]">
                  {state === "accepted" ? "accepted" : `+${ch.additions}`}
                </span>
                {reviewMode && state === "pending" ? (
                  <button
                    type="button"
                    onClick={() => onReject(ch.id)}
                    className="ml-2 shrink-0 text-[10px] text-red-400 hover:underline"
                  >
                    Reject
                  </button>
                ) : null}
              </li>
            );
          },
        )}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setReviewMode(true);
            onReview();
          }}
          className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-[#b0b8c1] hover:border-[#4593fc]/30"
        >
          Review
        </button>
        {pending.length > 0 ? (
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-400"
          >
            Accept all
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StatusPane({
  snapshot,
  onPublish,
}: {
  snapshot: DevProjectSnapshot;
  onPublish: () => void;
}) {
  const rows = [
    {
      label: "Capabilities",
      value: String(snapshot.capabilityCount),
      ok: snapshot.capabilityCount > 0,
    },
    {
      label: "Tests",
      value: `${snapshot.testsPassed}/${snapshot.testsTotal}`,
      ok: snapshot.testsPassed === snapshot.testsTotal && snapshot.testsTotal > 0,
    },
    {
      label: "Agent Ready",
      value: snapshot.status.agentReady ? "Yes" : "No",
      ok: snapshot.status.agentReady,
    },
    {
      label: "Rimvio Certified",
      value: snapshot.status.rimvioCertified ? "Yes" : "Pending",
      ok: snapshot.status.rimvioCertified,
    },
    {
      label: "Published",
      value: snapshot.status.published ? "Live" : "Draft",
      ok: snapshot.status.published,
    },
  ];

  return (
    <div className="overflow-y-auto p-6 rimvio-scroll-touch">
      <div className="mx-auto max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">Status</p>
        <h2 className="mt-2 text-[18px] font-bold text-[#f2f4f6]">{snapshot.status.summaryKo}</h2>

        <ul className="mt-6 space-y-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#151820] px-4 py-3"
            >
              <span className="text-[12px] text-[#b0b8c1]">{row.label}</span>
              <span
                className={cn(
                  "text-[12px] font-semibold",
                  row.ok ? "text-emerald-400" : "text-[#6b7684]",
                )}
              >
                {row.ok ? "✓ " : ""}
                {row.value}
              </span>
            </li>
          ))}
        </ul>

        {snapshot.status.agentReady && !snapshot.status.published ? (
          <button
            type="button"
            onClick={onPublish}
            className="mt-6 w-full rounded-xl bg-[#4593fc] py-2.5 text-[13px] font-semibold text-white hover:bg-[#3a82e0]"
          >
            Publish to Capability Index
          </button>
        ) : null}
      </div>
    </div>
  );
}
