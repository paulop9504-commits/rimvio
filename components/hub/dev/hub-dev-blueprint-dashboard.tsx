"use client";

import { useEffect } from "react";
import {
  BarChart3,
  CreditCard,
  Database,
  GitBranch,
  Layers,
  Link2,
  Play,
  Puzzle,
  Rocket,
  Shield,
  Sparkles,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot, DevProjectSource } from "@/lib/hub/dev/dev-project-state";
import { buildDevBlueprintModel } from "@/lib/hub/dev/dev-blueprint-model";
import { buildDevAnalysisResult } from "@/lib/hub/dev/dev-analysis-result";
import { buildDevCapabilityRows } from "@/lib/hub/dev/dev-capability-exposure-ui";
import { HubDevAnalysisResultCard } from "@/components/hub/dev/hub-dev-analysis-result-card";
import { HubDevSchemaPreviewPanel } from "@/components/hub/dev/hub-dev-schema-preview-panel";
import { cn } from "@/lib/utils";

type HubDevBlueprintDashboardProps = {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly analyzedAtMs: number | null;
  readonly connectedSources: readonly DevProjectSource[];
  readonly connectValue: string;
  readonly analyzing: boolean;
  readonly onConnectValueChange: (v: string) => void;
  readonly onConnect: () => void;
  readonly onConnectGithub: () => void;
  readonly onLoadDemo: () => void;
  readonly onFilesDrop: (files: FileList) => void;
  readonly onAnalyze: () => void;
  readonly onFixIssues: () => void;
  readonly onRunTests: () => void;
  readonly onPreview: () => void;
  readonly onPublish: () => void;
  readonly onTestInvoke: (capabilityId: string) => void;
  readonly highlightSection?: string;
};

export function HubDevBlueprintDashboard(props: HubDevBlueprintDashboardProps) {
  const { draft, snapshot, analyzedAtMs, connectedSources, connectValue, analyzing } = props;
  const model = buildDevBlueprintModel({ draft, snapshot, analyzedAtMs });
  const analysis = buildDevAnalysisResult({ draft, snapshot, analyzedAtMs: analyzedAtMs ?? undefined });
  const displaySources = connectedSources.length ? connectedSources : snapshot.sources;
  const capabilityRows = buildDevCapabilityRows(draft.actions);
  const previewAction = draft.actions[0] ?? null;

  useEffect(() => {
    if (!props.highlightSection) return;
    const el = document.getElementById(`blueprint-section-${props.highlightSection}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [props.highlightSection]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] rimvio-scroll-touch">
      <div className="mx-auto max-w-[960px] space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">
                {draft.name || "New Platform"}
              </h1>
              {snapshot.status.agentReady ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Agent Ready
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {draft.description || "Hotel booking platform near Namba Station, Osaka"}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#374151] shadow-sm hover:bg-[#fafafa]"
          >
            Platform Blueprint
          </button>
        </div>

        {draft.actions.length === 0 ? (
          <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 shadow-sm">
            <p className="text-[14px] font-semibold text-[#111827]">Platform을 연결하거나 데모로 시작하세요</p>
            <p className="mt-1 text-[12px] text-[#6b7280]">
              GitHub · API · OpenAPI를 연결하면 Capability Blueprint가 자동 생성됩니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={props.onConnectGithub}
                disabled={analyzing}
                className="rounded-xl bg-violet-600 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
              >
                Connect GitHub
              </button>
              <button
                type="button"
                onClick={props.onLoadDemo}
                disabled={analyzing}
                className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-[12px] font-semibold text-violet-700 disabled:opacity-40"
              >
                Load OsakaStay Demo
              </button>
            </div>
          </section>
        ) : null}

        {analysis ? <HubDevAnalysisResultCard result={analysis} /> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <BlueprintCard
            id="blueprint-section-capabilities"
            title="Capabilities"
            count={model.capabilities.length}
            icon={<Puzzle className="size-4 text-violet-600" />}
            highlight={props.highlightSection === "capabilities"}
          >
            <CapabilityBadgeList rows={capabilityRows} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-data"
            title="Data"
            count={model.dataEntities.length}
            icon={<Database className="size-4 text-blue-600" />}
            highlight={props.highlightSection === "data"}
          >
            <TagList items={model.dataEntities} mono={false} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-workflows"
            title="Workflows"
            count={model.workflows.length}
            icon={<GitBranch className="size-4 text-indigo-600" />}
            highlight={props.highlightSection === "workflows"}
          >
            <TagList items={model.workflows} mono={false} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-permissions"
            title="Permissions"
            count={model.permissions.length}
            icon={<Shield className="size-4 text-amber-600" />}
            highlight={props.highlightSection === "permissions"}
          >
            <TagList items={model.permissions} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-context"
            title="Context"
            count={model.contextFields.length}
            icon={<Layers className="size-4 text-cyan-600" />}
            highlight={props.highlightSection === "context"}
          >
            <TagList items={model.contextFields} mono={false} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-runtime"
            title="Runtime"
            count={model.runtimes.length}
            icon={<Zap className="size-4 text-orange-600" />}
            highlight={props.highlightSection === "runtime"}
          >
            <div className="space-y-1">
              {model.runtimes.map((r) => (
                <p key={r} className="text-[11px] text-[#4b5563]">
                  <span className="font-medium text-[#111827]">{r}</span>
                </p>
              ))}
            </div>
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-commerce"
            title="Commerce"
            count={1}
            icon={<CreditCard className="size-4 text-pink-600" />}
            highlight={props.highlightSection === "commerce"}
          >
            <p className="text-[11px] font-medium text-[#374151]">{model.commerceLabel}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-[#6b7280]">
              <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-violet-700">payment.prepare</span>
              <span>→</span>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">user approval</span>
              <span>→</span>
              <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-violet-700">payment.commit</span>
            </div>
          </BlueprintCard>
          <BlueprintCard title="Platform Health" count={model.healthScore} countSuffix="%" icon={<BarChart3 className="size-4 text-emerald-600" />}>
            <div className="flex items-center gap-3">
              <HealthRing score={model.healthScore} />
              <ul className="space-y-0.5 text-[10px]">
                {model.healthChecks.map((c) => (
                  <li key={c.label} className={c.ok ? "text-emerald-600" : "text-[#9ca3af]"}>
                    {c.ok ? "✓" : "○"} {c.label}
                  </li>
                ))}
              </ul>
            </div>
          </BlueprintCard>
        </div>

        {previewAction ? (
          <HubDevSchemaPreviewPanel action={previewAction} onTestInvoke={props.onTestInvoke} />
        ) : null}

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Recent Activity</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {model.recentActivity.map((item) => (
              <span
                key={item.id}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium",
                  item.tone === "ok" && "bg-emerald-50 text-emerald-700",
                  item.tone === "warn" && "bg-amber-50 text-amber-700",
                  item.tone === "neutral" && "bg-[#f3f4f6] text-[#6b7280]",
                )}
              >
                {item.label}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Quick Actions</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <QuickAction icon={<Sparkles className="size-4" />} label="Analyze Platform" onClick={props.onAnalyze} />
            <QuickAction icon={<Wrench className="size-4" />} label="Fix Issues" onClick={props.onFixIssues} accent="amber" />
            <QuickAction icon={<Play className="size-4" />} label="Run Tests" onClick={props.onRunTests} />
            <QuickAction icon={<Rocket className="size-4" />} label="Preview" onClick={props.onPreview} />
            <QuickAction icon={<Upload className="size-4" />} label="Publish" onClick={props.onPublish} accent="violet" />
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Sources Connected</p>
          <ul className="mt-3 space-y-2">
            {displaySources.length ? (
              displaySources.map((src) => (
                <li key={src.id} className="flex items-center justify-between rounded-xl border border-[#f3f4f6] bg-[#fafafa] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link2 className="size-4 text-[#9ca3af]" />
                    <div>
                      <p className="text-[12px] font-medium text-[#111827]">{src.label}</p>
                      {src.detail ? <p className="text-[10px] text-[#9ca3af]">{src.detail}</p> : null}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Connected</span>
                </li>
              ))
            ) : (
              <li className="py-4 text-center text-[12px] text-[#9ca3af]">No sources yet</li>
            )}
          </ul>
        </section>

        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) props.onFilesDrop(e.dataTransfer.files);
          }}
          className="rounded-2xl border-2 border-dashed border-[#d1d5db] bg-white p-6 text-center shadow-sm"
        >
          <p className="text-[13px] font-semibold text-[#374151]">Add More Sources</p>
          <p className="mt-1 text-[11px] text-[#9ca3af]">Drop files or paste URL</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={props.onConnectGithub}
              disabled={analyzing}
              className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-medium text-[#374151] shadow-sm hover:bg-[#fafafa] disabled:opacity-40"
            >
              Connect GitHub
            </button>
            <label className="cursor-pointer rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-medium text-[#374151] shadow-sm hover:bg-[#fafafa]">
              Upload Files
              <input type="file" multiple className="hidden" onChange={(e) => e.target.files && props.onFilesDrop(e.target.files)} />
            </label>
          </div>
          <div className="mx-auto mt-4 flex max-w-md gap-2">
            <input
              value={connectValue}
              onChange={(e) => props.onConnectValueChange(e.target.value)}
              placeholder="Paste URL…"
              className="min-w-0 flex-1 rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[12px] focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="button"
              disabled={analyzing || !connectValue.trim()}
              onClick={props.onConnect}
              className="rounded-xl bg-violet-600 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              {analyzing ? "…" : "Connect"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function BlueprintCard({
  id,
  title,
  count,
  countSuffix,
  icon,
  highlight,
  children,
}: {
  id?: string;
  title: string;
  count: number;
  countSuffix?: string;
  icon: React.ReactNode;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn("rounded-2xl border bg-white p-3.5 shadow-sm", highlight ? "border-violet-300 ring-2 ring-violet-100" : "border-[#e5e7eb]")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">{icon}<p className="text-[11px] font-semibold text-[#374151]">{title}</p></div>
        <span className="text-[18px] font-bold tabular-nums text-[#111827]">{count}{countSuffix ?? ""}</span>
      </div>
      <div className="mt-2.5 max-h-[88px] overflow-hidden">{children}</div>
    </div>
  );
}

function CapabilityBadgeList({
  rows,
}: {
  rows: ReturnType<typeof buildDevCapabilityRows>;
}) {
  if (rows.length === 0) {
    return <p className="text-[10px] text-[#9ca3af]">No capabilities yet</p>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {rows.slice(0, 6).map(({ action, badge, badgeLabel }) => (
        <span
          key={action.id}
          className="inline-flex items-center gap-1 rounded-md bg-[#f3f4f6] px-1.5 py-0.5 font-mono text-[10px] text-[#4b5563]"
        >
          {action.name}
          <span
            className={cn(
              "rounded px-1 text-[8px] font-bold uppercase",
              badge === "approval" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
            )}
          >
            {badgeLabel}
          </span>
        </span>
      ))}
    </div>
  );
}

function TagList({ items, mono = true }: { items: readonly string[]; mono?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 6).map((item) => (
        <span key={item} className={cn("rounded-md bg-[#f3f4f6] px-1.5 py-0.5 text-[10px] text-[#4b5563]", mono && "font-mono")}>{item}</span>
      ))}
    </div>
  );
}

function HealthRing({ score }: { score: number }) {
  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#10b981 ${score * 3.6}deg, #e5e7eb 0deg)` }}>
      <div className="flex size-10 items-center justify-center rounded-full bg-white text-[11px] font-bold text-emerald-600">{score}%</div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: "amber" | "violet" }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex flex-col items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-2 py-3 text-[11px] font-medium text-[#374151] hover:bg-white hover:shadow-sm", accent === "violet" && "border-violet-200 bg-violet-50 text-violet-700", accent === "amber" && "border-amber-200 bg-amber-50 text-amber-800")}>
      {icon}{label}
    </button>
  );
}
