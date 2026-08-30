"use client";

import { useRef, useState } from "react";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type {
  DevProjectSnapshot,
  DevProjectIssue,
  DevProjectChange,
  DevProjectSource,
  DevChangeReviewState,
} from "@/lib/hub/dev/dev-project-state";
import type { ChangeExplanation } from "@/lib/hub/dev/hub-change-explanation";
import type { AnalyzedPlatformBlueprint } from "@/lib/hub/dev/platform-analyzer";
import { type DevWorkspacePane } from "@/lib/hub/dev/dev-workspace-nav";
import { cn } from "@/lib/utils";
import { HubDevCapabilityList } from "@/components/hub/dev/hub-dev-capability-view";
import { HubDevAgentSimulation } from "@/components/hub/dev/hub-dev-agent-simulation";
import { HubDevPublishPanel } from "@/components/hub/dev/hub-dev-publish-panel";
import { HubDevVersionsPanel } from "@/components/hub/dev/hub-dev-versions-panel";
import { HubStandardsPanel } from "@/components/hub/standards/hub-standards-panel";
import type { HubStandardsView } from "@/lib/hub/standards";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import type { HubPublishOptions } from "@/lib/hub/dev/hub-publish-model";
import { HubDevBlueprintDashboard } from "@/components/hub/dev/hub-dev-blueprint-dashboard";
import { HubConnectedHubsPanel } from "@/components/hub/dev/hub-connected-hubs-panel";
import { HubDevConnectionsPanel } from "@/components/hub/dev/hub-dev-connections-panel";
import type { HubDevConnections } from "@/lib/hub/dev/hub-connection-store";
import { HubDevWorkflowEditor } from "@/components/hub/dev/hub-dev-workflow-editor";
import { HubLoopBuilder } from "@/components/hub/dev/hub-loop-builder";
import { HubDevCommercePanel } from "@/components/hub/dev/hub-dev-commerce-panel";
import { HubDevRuntimeWorkspace } from "@/components/hub/dev/hub-dev-runtime-workspace";
import { HubAskRimvioBar } from "@/components/hub/dev/hub-ask-rimvio-bar";
import { HubDevSandboxPreview } from "@/components/hub/dev/hub-dev-sandbox-preview";
import { HubExperienceResourcePane } from "@/components/hub/dev/hub-experience-resource-pane";
import {
  HubExperienceAuthPane,
  HubExperienceDatabasePane,
  HubExperienceDomainsPane,
  HubExperienceLogsPane,
  HubExperienceRuntimePane,
  HubExperienceSecretsPane,
  HubExperienceUsersPane,
  HubExperienceVerificationPane,
} from "@/components/hub/dev/hub-experience-os-panes";
import {
  HubDevContextWorkspace,
  HubDevDataWorkspace,
  HubDevHealthWorkspace,
  HubDevPermissionsWorkspace,
} from "@/components/hub/dev/hub-dev-section-workspaces";

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
  readonly changeExplanations?: readonly ChangeExplanation[];
  readonly onAcceptAllChanges: () => void;
  readonly onRejectChange: (changeId: string) => void;
  readonly onReviewChanges: () => void;
  readonly onTestInvoke: (
    capabilityId: string,
    record: import("@/lib/hub/dev/invoke-dev-capability").DevCapabilityInvokeRecord,
  ) => void;
  readonly onAnalyzePlatform: () => void;
  readonly onFixAllIssues: () => void;
  readonly onRunTests: () => void;
  readonly onPreview: () => void;
  readonly onConnectGithub: () => void;
  readonly onLoadDemo: () => void;
  readonly platformId?: string;
  readonly connections?: HubDevConnections;
  readonly standardsView?: HubStandardsView;
  readonly onOpenPane?: (pane: DevWorkspacePane) => void;
  readonly onAskOperator?: (text: string) => void;
  readonly onConnectStripe?: () => void;
  readonly onConnectVercel?: () => void;
  readonly onConnectSupabase?: () => void;
  readonly onDraftPatch?: (patch: Partial<PlatformDraft>) => void;
  readonly showPreview?: boolean;
  readonly onBuildIdea?: (text: string) => void;
};

function isBlueprintPane(pane: DevWorkspacePane): boolean {
  return pane === "ade";
}

export function HubDevCenterPane(props: HubDevCenterPaneProps) {
  if (isBlueprintPane(props.pane)) {
    const sources = props.connectedSource ? [props.connectedSource, ...props.snapshot.sources] : props.snapshot.sources;
    return (
      <HubDevBlueprintDashboard
        draft={props.draft}
        snapshot={props.snapshot}
        analyzedAtMs={props.analyzedAtMs}
        connectedSources={sources}
        connectValue={props.connectValue}
        analyzing={props.analyzing}
        onConnectValueChange={props.onConnectValueChange}
        onConnect={props.onConnect}
        onConnectGithub={props.onConnectGithub}
        onLoadDemo={props.onLoadDemo}
        connections={props.connections}
        onFilesDrop={props.onFilesDrop}
        onAnalyze={props.onAnalyzePlatform}
        onFixIssues={props.onFixAllIssues}
        onRunTests={props.onRunTests}
        onPreview={props.onPreview}
        onPublish={() => props.onPublish()}
        onTestInvoke={props.onTestInvoke}
        highlightSection={props.pane === "ade" ? undefined : props.pane}
        onOpenPane={props.onOpenPane}
        onSelectCapability={props.onSelectCapability}
        onAskOperator={props.onAskOperator}
        onConnectStripe={props.onConnectStripe}
        onConnectVercel={props.onConnectVercel}
        onConnectSupabase={props.onConnectSupabase}
        onBuildIdea={props.onBuildIdea}
        onDraftPatch={props.onDraftPatch}
      />
    );
  }

  switch (props.pane) {
    case "sources":
      return (
        <SourcesPane
          sources={props.snapshot.sources}
          files={props.snapshot.files}
          platformId={props.platformId}
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
          changeExplanations={props.changeExplanations}
          onAcceptAll={props.onAcceptAllChanges}
          onReject={props.onRejectChange}
          onReview={props.onReviewChanges}
        />
      );
    case "status":
      return (
        <HubDevHealthWorkspace
          draft={props.draft}
          snapshot={props.snapshot}
          onUpdateDraft={(patch) => props.onDraftPatch?.(patch)}
          onOpenPane={(pane) => props.onOpenPane?.(pane)}
        />
      );
    case "data":
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <HubDevDataWorkspace
            draft={props.draft}
            snapshot={props.snapshot}
            onUpdateDraft={(patch) => props.onDraftPatch?.(patch)}
            onOpenPane={(pane) => props.onOpenPane?.(pane)}
          />
          <HubExperienceDatabasePane
            draft={props.draft}
            onAsk={(text) => props.onAskOperator?.(text)}
            onDraftPatch={props.onDraftPatch}
          />
        </div>
      );
    case "storage":
      return (
        <HubExperienceResourcePane
          title="Storage"
          description="Buckets for images, avatars, and uploads."
          draft={props.draft}
          listOp="storage.listBuckets"
          listKey="buckets"
          emptyPrompt="상품 이미지용 storage 만들어줘."
          createLabel="Create Storage"
          createOp="storage.createBucket"
          createName="uploads"
          onAsk={(text) => props.onAskOperator?.(text)}
          onDraftPatch={props.onDraftPatch}
        />
      );
    case "users":
      return (
        <HubExperienceUsersPane
          draft={props.draft}
          onAsk={(text) => props.onAskOperator?.(text)}
          onDraftPatch={props.onDraftPatch}
        />
      );
    case "auth":
      return (
        <HubExperienceAuthPane
          draft={props.draft}
          onAsk={(text) => props.onAskOperator?.(text)}
          onDraftPatch={props.onDraftPatch}
        />
      );
    case "functions":
      return (
        <HubExperienceResourcePane
          title="Functions"
          description="API functions generated from Capabilities."
          draft={props.draft}
          listOp="function.list"
          listKey="functions"
          emptyPrompt="상품 등록 API를 만들어줘."
          createLabel="Create Function"
          createOp="function.create"
          createName="api.health"
          onAsk={(text) => props.onAskOperator?.(text)}
          onDraftPatch={props.onDraftPatch}
        />
      );
    case "loops":
      return (
        <HubLoopBuilder
          draft={props.draft}
          platformId={props.platformId}
          onAskOperator={props.onAskOperator}
        />
      );
    case "automations":
      return (
        <HubExperienceResourcePane
          title="Automations"
          description="시간·이벤트 기반 작업. Cron을 직접 쓰지 않아도 됩니다."
          draft={props.draft}
          listOp="job.list"
          listKey="jobs"
          emptyPrompt="매일 아침 판매자 주문 요약을 보내줘."
          createLabel="Create Automation"
          createOp="job.create"
          createName="daily-summary"
          onAsk={(text) => props.onAskOperator?.(text)}
          onDraftPatch={props.onDraftPatch}
        />
      );
    case "workflows":
      return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-3">
          <HubDevWorkflowEditor
            draft={props.draft}
            selectedNodeId={props.selectedCapabilityId}
            onSelectNode={(id) => id && props.onSelectCapability(id)}
            onApplyDraft={(next) => props.onDraftPatch?.(next)}
          />
          <HubAskRimvioBar
            placeholder="워크플로우를 바꿔줘"
            onAsk={(text) => props.onAskOperator?.(text)}
          />
        </div>
      );
    case "permissions":
      return (
        <HubDevPermissionsWorkspace
          draft={props.draft}
          snapshot={props.snapshot}
          onUpdateDraft={(patch) => props.onDraftPatch?.(patch)}
          onOpenPane={(pane) => props.onOpenPane?.(pane)}
        />
      );
    case "context":
      return (
        <HubDevContextWorkspace
          draft={props.draft}
          snapshot={props.snapshot}
          onUpdateDraft={(patch) => props.onDraftPatch?.(patch)}
          onOpenPane={(pane) => props.onOpenPane?.(pane)}
        />
      );
    case "runtime":
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {props.showPreview ? <HubDevSandboxPreview draft={props.draft} /> : null}
          <HubExperienceRuntimePane
            draft={props.draft}
            onAsk={(text) => props.onAskOperator?.(text)}
            onDraftPatch={props.onDraftPatch}
            onPreview={() => props.onPreview?.()}
          />
          <HubDevRuntimeWorkspace
            draft={props.draft}
            publishStatus={props.publishStatus as "idle"}
          />
        </div>
      );
    case "commerce":
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <HubDevCommercePanel draft={props.draft} />
          <div className="bg-[#f8fafc] px-6 pb-6">
            <HubAskRimvioBar
              placeholder="결제 기능 연결해줘"
              onAsk={(text) => props.onAskOperator?.(text)}
            />
          </div>
        </div>
      );
    case "capabilities":
      return (
        <div className="min-h-0 flex-1 bg-[#f4f5f7]">
          <HubDevCapabilityList
            draft={props.draft}
            actions={props.draft.actions}
            selectedId={props.selectedCapabilityId}
            testsPassed={props.testsPassed}
            onSelect={props.onSelectCapability}
            onViewConfiguration={props.onSelectCapability}
            onTest={() => {
              const cap = props.draft.actions.find((a) => a.id === props.selectedCapabilityId);
              if (cap) {
                props.onAskOperator?.(`${cap.name} Capability를 Test Invoke로 실행하고 검증해줘`);
                props.onOpenPane?.("ade");
              }
              void props.onTestComplete(true);
            }}
            onEditWithAi={() => {
              const cap = props.draft.actions.find((a) => a.id === props.selectedCapabilityId);
              props.onAskOperator?.(
                cap ? `${cap.name} Capability를 수정해줘` : "선택한 Capability를 수정해줘",
              );
            }}
            onOpenCode={() => {
              if (props.selectedCapabilityId) props.onSelectCapability(props.selectedCapabilityId);
            }}
          />
        </div>
      );
    case "tests":
      return (
        <HubDevAgentSimulation draft={props.draft} onComplete={props.onTestComplete} />
      );
    case "verification":
      return (
        <HubExperienceVerificationPane
          draft={props.draft}
          onAsk={(text) => props.onAskOperator?.(text)}
        />
      );
    case "logs":
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <HubExperienceLogsPane
            draft={props.draft}
            onAsk={(text) => props.onAskOperator?.(text)}
          />
        </div>
      );
    case "secrets":
      return (
        <HubExperienceSecretsPane
          draft={props.draft}
          onAsk={(text) => props.onAskOperator?.(text)}
        />
      );
    case "domains":
      return (
        <HubExperienceDomainsPane
          draft={props.draft}
          onAsk={(text) => props.onAskOperator?.(text)}
        />
      );
    case "standards":
      return (
        <div className="min-h-0 flex-1">
          <HubStandardsPanel initialView={props.standardsView ?? "overview"} embedded />
        </div>
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
      return null;
  }
}

function SourcesPane({
  sources,
  files,
  platformId,
  onDrop,
}: {
  sources: readonly DevProjectSource[];
  files: DevProjectSnapshot["files"];
  platformId?: string;
  onDrop: (files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4 rimvio-scroll-touch">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-[#111827]">Sources</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[11px] font-semibold text-violet-600 hover:underline"
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
              className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-[11px] text-[#374151]"
            >
              <span className="mr-2 text-[10px] font-semibold uppercase text-violet-600">{src.kind}</span>
              {src.label}
              {src.detail ? (
                <span className="mt-0.5 block truncate text-[10px] text-[#9ca3af]">
                  {src.detail}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-[11px] text-[#9ca3af]">연결된 source 없음 — Blueprint에서 Connect</p>
      )}

      {files.length > 0 ? (
        <>
          <p className="mb-2 text-[10px] font-semibold uppercase text-[#9ca3af]">Derived files</p>
          <ul className="space-y-1">
            {files.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 font-mono text-[11px] text-[#374151] shadow-sm"
              >
                {f.path}
                <span className="ml-2 text-[10px] text-[#9ca3af]">{f.kind}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="mb-4">
        <HubDevConnectionsPanel platformId={platformId} />
      </div>

      <div className="mt-6 border-t border-[#e5e7eb] pt-4">
        <HubConnectedHubsPanel />
      </div>
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
      <div className="flex flex-1 items-center justify-center bg-[#f4f5f7] p-8 text-[13px] text-emerald-600">
        ✓ No issues
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4 rimvio-scroll-touch">
      <p className="mb-3 text-[12px] text-[#6b7280]">
        {issues.filter((i) => i.severity === "error").length} errors ·{" "}
        {issues.filter((i) => i.severity === "warning").length} warnings
      </p>
      <ul className="space-y-3">
        {issues.map((issue) => (
          <li
            key={issue.id}
            className={cn(
              "rounded-2xl border bg-white p-4 shadow-sm",
              issue.severity === "error" ? "border-red-200" : "border-amber-200",
            )}
          >
            <p className="text-[12px] font-semibold text-[#111827]">
              {issue.severity === "error" ? "🔴" : "🟡"} {issue.title}
            </p>
            <p className="mt-1 text-[11px] text-[#6b7280]">{issue.detail}</p>
            <button
              type="button"
              onClick={() => onFix(issue)}
              className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
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
  changeExplanations,
  onAcceptAll,
  onReject,
  onReview,
}: {
  changes: readonly DevProjectChange[];
  changeReview: Readonly<Record<string, DevChangeReviewState>>;
  changeExplanations?: readonly ChangeExplanation[];
  onAcceptAll: () => void;
  onReject: (changeId: string) => void;
  onReview: () => void;
}) {
  const [reviewMode, setReviewMode] = useState(false);
  const pending = changes.filter((ch) => (changeReview[ch.id] ?? "pending") === "pending");
  const accepted = changes.filter((ch) => changeReview[ch.id] === "accepted");

  if (changes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#f4f5f7] p-8 text-[13px] text-[#9ca3af]">
        Agent changes appear here after analyze
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4 rimvio-scroll-touch">
      <p className="mb-1 text-[12px] font-semibold text-[#111827]">Agent Changes</p>
      <p className="mb-3 text-[11px] text-[#6b7280]">
        {pending.length} pending · {accepted.length} accepted
      </p>
      <ul className="space-y-1 font-mono text-[11px]">
        {(reviewMode ? pending : changes.filter((ch) => changeReview[ch.id] !== "rejected")).map(
          (ch) => {
            const state = changeReview[ch.id] ?? "pending";
            const explanation = changeExplanations?.find((e) => e.changeId === ch.id);
            return (
              <li
                key={ch.id}
                className={cn(
                  "rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[#374151] shadow-sm",
                  state === "accepted" && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="truncate">
                    <span className={ch.kind === "add" ? "text-emerald-600" : "text-amber-600"}>
                      {ch.kind === "add" ? "+" : "~"}
                    </span>{" "}
                    {ch.path}
                  </span>
                  <span className="ml-2 shrink-0 text-[10px] text-[#9ca3af]">
                    {state === "accepted" ? "accepted" : `+${ch.additions}`}
                  </span>
                  {reviewMode && state === "pending" ? (
                    <button
                      type="button"
                      onClick={() => onReject(ch.id)}
                      className="ml-2 shrink-0 text-[10px] text-red-600 hover:underline"
                    >
                      Reject
                    </button>
                  ) : null}
                </div>
                {explanation ? (
                  <p className="mt-1 text-[10px] leading-snug text-[#6b7280]">{explanation.whyKo}</p>
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
          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[11px] text-[#374151] shadow-sm hover:border-violet-200"
        >
          Review
        </button>
        {pending.length > 0 ? (
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200"
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
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-6 rimvio-scroll-touch">
      <div className="mx-auto max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Status</p>
        <h2 className="mt-2 text-[18px] font-bold text-[#111827]">{snapshot.status.summaryKo}</h2>

        <ul className="mt-6 space-y-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 shadow-sm"
            >
              <span className="text-[12px] text-[#6b7280]">{row.label}</span>
              <span
                className={cn(
                  "text-[12px] font-semibold",
                  row.ok ? "text-emerald-600" : "text-[#9ca3af]",
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
            className="mt-6 w-full rounded-xl bg-violet-600 py-2.5 text-[13px] font-semibold text-white hover:bg-violet-700"
          >
            Publish to Capability Index
          </button>
        ) : null}
      </div>
    </div>
  );
}
