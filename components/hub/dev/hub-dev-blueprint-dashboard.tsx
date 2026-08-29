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
import { buildDevCapabilityRows } from "@/lib/hub/dev/dev-capability-exposure-ui";
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
  const displaySources = connectedSources.length ? connectedSources : snapshot.sources;
  const capabilityRows = buildDevCapabilityRows(draft.actions);
  const previewAction = draft.actions[0] ?? null;

  useEffect(() => {
    if (!props.highlightSection) return;
    const el = document.getElementById(`blueprint-section-${props.highlightSection}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [props.highlightSection]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f9fafb] rimvio-scroll-touch">
      <div className="border-b border-[#e5e7eb] bg-white px-3.5 py-1.5">
        <div className="mx-auto flex max-w-[900px] gap-4">
          <span className="border-b-2 border-violet-600 pb-1 text-[10px] font-semibold text-violet-700">Workspace</span>
          <span className="pb-1 text-[10px] font-medium text-[#9ca3af]">Blueprint (Auto-generated)</span>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] space-y-2.5 p-3">
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm">
          <div className="flex min-w-0 items-start gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[12px] font-bold text-violet-700">
              {(draft.name || "N").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-[14px] font-bold tracking-tight text-[#111827]">
                  {draft.name || "New Platform"}
                </h1>
                {snapshot.status.agentReady ? (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-px text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Agent Ready
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[10px] leading-snug text-[#6b7280]">
                {draft.description || "Hotel booking platform near Namba Station, Osaka"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1 text-[10px] font-semibold text-[#374151] hover:bg-white"
          >
            Platform Blueprint
          </button>
        </div>

        {draft.actions.length === 0 ? (
          <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#111827]">Platform을 연결하거나 데모로 시작하세요</p>
            <p className="mt-0.5 text-[10px] text-[#6b7280]">
              GitHub · API · OpenAPI를 연결하면 Capability Blueprint가 자동 생성됩니다.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={props.onConnectGithub}
                disabled={analyzing}
                className="rounded-lg bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
              >
                Connect GitHub
              </button>
              <button
                type="button"
                onClick={props.onLoadDemo}
                disabled={analyzing}
                className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700 disabled:opacity-40"
              >
                Load OsakaStay Demo
              </button>
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <BlueprintCard
            id="blueprint-section-capabilities"
            title="Capabilities"
            count={model.capabilities.length}
            icon={<Puzzle className="size-3 text-violet-600" />}
            highlight={props.highlightSection === "capabilities"}
          >
            <CapabilityBadgeList rows={capabilityRows} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-data"
            title="Data"
            count={model.dataEntities.length}
            icon={<Database className="size-3 text-blue-600" />}
            highlight={props.highlightSection === "data"}
          >
            <TagList items={model.dataEntities} mono={false} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-workflows"
            title="Workflows"
            count={model.workflows.length}
            icon={<GitBranch className="size-3 text-indigo-600" />}
            highlight={props.highlightSection === "workflows"}
          >
            <TagList items={model.workflows} mono={false} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-permissions"
            title="Permissions"
            count={model.permissions.length}
            icon={<Shield className="size-3 text-amber-600" />}
            highlight={props.highlightSection === "permissions"}
          >
            <TagList items={model.permissions} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-context"
            title="Context"
            count={model.contextFields.length}
            icon={<Layers className="size-3 text-cyan-600" />}
            highlight={props.highlightSection === "context"}
          >
            <TagList items={model.contextFields} mono={false} />
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-runtime"
            title="Runtime"
            count={model.runtimes.length}
            icon={<Zap className="size-3 text-orange-600" />}
            highlight={props.highlightSection === "runtime"}
          >
            <div className="space-y-1">
              {model.runtimes.map((r) => (
                <p key={r} className="text-[9px] text-[#4b5563]">
                  <span className="font-medium text-[#111827]">{r}</span>
                </p>
              ))}
            </div>
          </BlueprintCard>
          <BlueprintCard
            id="blueprint-section-commerce"
            title="Commerce"
            count={1}
            icon={<CreditCard className="size-3 text-pink-600" />}
            highlight={props.highlightSection === "commerce"}
          >
            <p className="text-[9px] font-medium text-[#374151]">{model.commerceLabel}</p>
            <div className="mt-1 flex flex-wrap items-center gap-0.5 text-[8px] text-[#6b7280]">
              <span className="rounded bg-violet-50 px-1 py-px font-mono text-violet-700">payment.prepare</span>
              <span>→</span>
              <span className="rounded bg-amber-50 px-1 py-px text-amber-700">user approval</span>
              <span>→</span>
              <span className="rounded bg-violet-50 px-1 py-px font-mono text-violet-700">payment.commit</span>
            </div>
          </BlueprintCard>
          <BlueprintCard title="Platform Health" count={model.healthScore} countSuffix="%" icon={<BarChart3 className="size-3 text-emerald-600" />}>
            <p className="mb-0.5 text-[7px] text-[#9ca3af]">Agent Readiness Score</p>
            <div className="flex items-center gap-2">
              <HealthRing score={model.healthScore} />
              <ul className="space-y-px text-[8px]">
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

        <section className="rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">Recent Activity</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {model.recentActivity.map((item) => (
              <span
                key={item.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium",
                  item.tone === "ok" && "bg-emerald-50 text-emerald-700",
                  item.tone === "warn" && "bg-amber-50 text-amber-700",
                  item.tone === "neutral" && "bg-[#f3f4f6] text-[#6b7280]",
                )}
              >
                {item.label}
                <span className="text-[8px] opacity-60">{item.ago}</span>
              </span>
            ))}
          </div>
        </section>

        <section id="blueprint-section-quick-actions" className="rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">Quick Actions</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            <QuickAction icon={<Sparkles className="size-3" />} label="Analyze Platform" onClick={props.onAnalyze} />
            <QuickAction icon={<Wrench className="size-3" />} label="Fix Issues" onClick={props.onFixIssues} accent="amber" />
            <QuickAction icon={<Play className="size-3" />} label="Run Tests" onClick={props.onRunTests} />
            <QuickAction icon={<Rocket className="size-3" />} label="Preview" onClick={props.onPreview} />
            <QuickAction icon={<Upload className="size-3" />} label="Publish" onClick={props.onPublish} accent="violet" />
          </div>
        </section>

        {(displaySources.length > 0 || draft.actions.length > 0) ? (
          <div className="grid gap-2 lg:grid-cols-2">
            <section className="rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">Connected Services</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ServiceChip label="GitHub" connected />
                <ServiceChip label="OpenAI" connected={draft.actions.length > 0} />
                <ServiceChip label="MCP Server" connected={displaySources.length > 1} />
              </div>
              <ul className="mt-2 space-y-1">
                {displaySources.length ? (
                  displaySources.map((src) => (
                    <li key={src.id} className="flex items-center justify-between rounded-lg border border-[#f3f4f6] bg-[#fafafa] px-2 py-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Link2 className="size-3 shrink-0 text-[#9ca3af]" />
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium text-[#111827]">{src.label}</p>
                          {src.detail ? <p className="truncate text-[8px] text-[#9ca3af]">{src.detail}</p> : null}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[8px] font-semibold text-emerald-700">Connected</span>
                    </li>
                  ))
                ) : null}
              </ul>
            </section>

            <section
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length) props.onFilesDrop(e.dataTransfer.files);
              }}
              className="rounded-xl border border-dashed border-[#d1d5db] bg-white p-3 text-center shadow-sm"
            >
              <p className="text-[10px] font-semibold text-[#374151]">Add More Sources</p>
              <p className="mt-0.5 text-[9px] text-[#9ca3af]">Drop files or paste URL</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <button
                  type="button"
                  onClick={props.onConnectGithub}
                  disabled={analyzing}
                  className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2 py-1 text-[9px] font-medium text-[#374151] hover:bg-white disabled:opacity-40"
                >
                  Connect GitHub
                </button>
                <label className="cursor-pointer rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2 py-1 text-[9px] font-medium text-[#374151] hover:bg-white">
                  Upload Files
                  <input type="file" multiple className="hidden" onChange={(e) => e.target.files && props.onFilesDrop(e.target.files)} />
                </label>
                <button
                  type="button"
                  disabled={analyzing}
                  className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2 py-1 text-[9px] font-medium text-[#374151] hover:bg-white disabled:opacity-40"
                >
                  Paste URL
                </button>
              </div>
              <div className="mx-auto mt-2 flex max-w-sm gap-1.5">
                <input
                  value={connectValue}
                  onChange={(e) => props.onConnectValueChange(e.target.value)}
                  placeholder="Paste URL…"
                  className="min-w-0 flex-1 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2 py-1 text-[9px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-100"
                />
                <button
                  type="button"
                  disabled={analyzing || !connectValue.trim()}
                  onClick={props.onConnect}
                  className="rounded-lg bg-violet-600 px-2 py-1 text-[9px] font-semibold text-white disabled:opacity-40"
                >
                  {analyzing ? "…" : "Connect"}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <section className="rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">Sources Connected</p>
            <p className="mt-2 py-2 text-center text-[10px] text-[#9ca3af]">No sources yet</p>
          </section>
        )}
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
      className={cn("rounded-lg border bg-white p-2 shadow-sm", highlight ? "border-violet-300 ring-1 ring-violet-100" : "border-[#e5e7eb]")}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1">{icon}<p className="truncate text-[9px] font-semibold text-[#374151]">{title}</p></div>
        <span className="shrink-0 text-[13px] font-bold tabular-nums leading-none text-[#111827]">{count}{countSuffix ?? ""}</span>
      </div>
      <div className="mt-1.5 max-h-[64px] overflow-hidden">{children}</div>
      <button type="button" className="mt-1 text-[8px] font-medium text-violet-600 hover:underline">View all</button>
    </div>
  );
}

function CapabilityBadgeList({
  rows,
}: {
  rows: ReturnType<typeof buildDevCapabilityRows>;
}) {
  if (rows.length === 0) {
    return <p className="text-[8px] text-[#9ca3af]">No capabilities yet</p>;
  }
  return (
    <div className="flex flex-wrap gap-0.5">
      {rows.slice(0, 4).map(({ action, badge, badgeLabel }) => (
        <span
          key={action.id}
          className="inline-flex items-center gap-0.5 rounded bg-[#f3f4f6] px-1 py-px font-mono text-[8px] text-[#4b5563]"
        >
          {action.name}
          <span
            className={cn(
              "rounded px-0.5 text-[7px] font-bold uppercase",
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
    <div className="flex flex-wrap gap-0.5">
      {items.slice(0, 4).map((item) => (
        <span key={item} className={cn("rounded bg-[#f3f4f6] px-1 py-px text-[8px] text-[#4b5563]", mono && "font-mono")}>{item}</span>
      ))}
    </div>
  );
}

function HealthRing({ score }: { score: number }) {
  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#10b981 ${score * 3.6}deg, #e5e7eb 0deg)` }}>
      <div className="flex size-7 items-center justify-center rounded-full bg-white text-[8px] font-bold text-emerald-600">{score}%</div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: "amber" | "violet" }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex flex-col items-center gap-1 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-1.5 py-2 text-[8px] font-medium text-[#374151] hover:bg-white hover:shadow-sm", accent === "violet" && "border-violet-200 bg-violet-50 text-violet-700", accent === "amber" && "border-amber-200 bg-amber-50 text-amber-800")}>
      {icon}{label}
    </button>
  );
}

function ServiceChip({ label, connected }: { label: string; connected?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-px text-[8px] font-medium",
        connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-[#e5e7eb] bg-[#fafafa] text-[#9ca3af]",
      )}
    >
      <span className={cn("size-1 rounded-full", connected ? "bg-emerald-500" : "bg-[#d1d5db]")} />
      {label}
    </span>
  );
}

