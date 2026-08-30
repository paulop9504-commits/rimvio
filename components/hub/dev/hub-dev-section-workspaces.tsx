"use client";

import { useMemo, useState } from "react";
import { HubDevCommercePanel } from "@/components/hub/dev/hub-dev-commerce-panel";
import { HubDevLogsPanel } from "@/components/hub/dev/hub-dev-logs-panel";
import { HubDevWorkflowEditor } from "@/components/hub/dev/hub-dev-workflow-editor";
import { buildDevBlueprintModel } from "@/lib/hub/dev/dev-blueprint-model";
import {
  readPlatformContextValues,
  writePlatformContextValues,
  type PlatformContextValues,
} from "@/lib/hub/dev/platform-context-values";
import { buildDevRuntimeSnapshot } from "@/lib/hub/dev/execution-log";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type UpdateDraft = (patch: Partial<PlatformDraft>) => void;

type SectionWorkspaceShared = {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly onUpdateDraft: UpdateDraft;
  readonly onOpenPane: (pane: "capabilities" | "tests" | "deploy" | "status" | "issues") => void;
};

export function HubDevDataWorkspace({ draft, snapshot }: SectionWorkspaceShared) {
  const model = buildDevBlueprintModel({ draft, snapshot });
  const collections = useMemo(() => parseJsonArray(draft.dataCollectionsJson), [draft.dataCollectionsJson]);
  return (
    <SectionShell title="Data" subtitle="Platform entities and declared collections">
      <ul className="grid gap-2 sm:grid-cols-2">
        {model.dataEntities.map((entity) => (
          <li key={entity} className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 shadow-sm">
            <p className="font-mono text-[12px] font-semibold text-[#111827]">{entity}</p>
            <p className="mt-0.5 text-[10px] text-[#9ca3af]">Derived from capability names</p>
          </li>
        ))}
      </ul>
      <section className="mt-4 rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-sm">
        <p className="text-[10px] font-semibold uppercase text-[#9ca3af]">Collections</p>
        {collections.length === 0 ? (
          <p className="mt-2 text-[11px] text-[#9ca3af]">선언된 collection이 없습니다. Manifest의 dataCollections를 확인하세요.</p>
        ) : (
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-[#374151]">
            {collections.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        )}
      </section>
    </SectionShell>
  );
}

export function HubDevWorkflowsWorkspace({ draft, onUpdateDraft }: SectionWorkspaceShared) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[#e5e7eb] bg-white px-4 py-2">
        <p className="text-[10px] font-semibold uppercase text-[#9ca3af]">Workflows</p>
        <p className="text-[12px] font-semibold text-[#111827]">Capability pipeline</p>
      </div>
      <div className="min-h-0 flex-1">
        <HubDevWorkflowEditor
          draft={draft}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onApplyDraft={onUpdateDraft}
        />
      </div>
    </div>
  );
}

export function HubDevPermissionsWorkspace({ draft, onUpdateDraft }: SectionWorkspaceShared) {
  return (
    <SectionShell title="Permissions" subtitle="Declared scopes — toggle to update the draft">
      <ul className="space-y-2">
        {draft.permissions.map((perm) => (
          <li
            key={perm.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold text-[#111827]">{perm.id}</p>
              <p className="mt-0.5 text-[10px] text-[#6b7280]">{perm.whyNeeded || perm.label}</p>
              <p className="mt-0.5 text-[9px] uppercase text-[#9ca3af]">{perm.risk}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateDraft({
                  permissions: draft.permissions.map((p) =>
                    p.id === perm.id ? { ...p, enabled: !p.enabled } : p,
                  ),
                })
              }
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold",
                perm.enabled
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-[#f3f4f6] text-[#9ca3af]",
              )}
            >
              {perm.enabled ? "Enabled" : "Off"}
            </button>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function HubDevContextWorkspace({ draft }: SectionWorkspaceShared) {
  const [values, setValues] = useState<PlatformContextValues>(() =>
    readPlatformContextValues(draft.id),
  );
  const [saved, setSaved] = useState(false);
  const fields =
    draft.selectedContext.length > 0
      ? draft.selectedContext
      : [
          { id: "destination", label: "destination", type: "string", path: "destination" },
          { id: "checkIn", label: "dates.checkIn", type: "date", path: "dates.checkIn" },
          { id: "checkOut", label: "dates.checkOut", type: "date", path: "dates.checkOut" },
          { id: "guests", label: "guests", type: "number", path: "guests" },
        ];

  const persist = (next: PlatformContextValues) => {
    setValues(next);
    writePlatformContextValues(draft.id, next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <SectionShell title="Context" subtitle="Preview · Test Invoke가 읽는 현재 platform context">
      <ul className="mb-3 flex flex-wrap gap-1.5">
        {fields.map((field) => (
          <li key={field.id} className="rounded-full bg-[#f3f4f6] px-2 py-0.5 font-mono text-[10px] text-[#4b5563]">
            {field.path}
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="destination">
          <input
            value={values.destination}
            onChange={(e) => persist({ ...values, destination: e.target.value })}
            className="w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-[12px] focus:border-violet-400 focus:outline-none"
          />
        </Field>
        <Field label="guests">
          <input
            type="number"
            min={1}
            value={values.guests}
            onChange={(e) => persist({ ...values, guests: Number(e.target.value) || 1 })}
            className="w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-[12px] focus:border-violet-400 focus:outline-none"
          />
        </Field>
        <Field label="dates.checkIn">
          <input
            type="date"
            value={values.checkIn}
            onChange={(e) => persist({ ...values, checkIn: e.target.value })}
            className="w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-[12px] focus:border-violet-400 focus:outline-none"
          />
        </Field>
        <Field label="dates.checkOut">
          <input
            type="date"
            value={values.checkOut}
            onChange={(e) => persist({ ...values, checkOut: e.target.value })}
            className="w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-[12px] focus:border-violet-400 focus:outline-none"
          />
        </Field>
      </div>
      <p className="mt-2 text-[10px] text-[#9ca3af]">
        {saved ? "저장됨 — Preview와 Test Invoke에 반영됩니다." : "변경은 이 브라우저에 저장됩니다."}
      </p>
    </SectionShell>
  );
}

export function HubDevRuntimeWorkspaceLite({
  draft,
  snapshot,
  onUpdateDraft,
  onOpenPane,
}: SectionWorkspaceShared & { readonly publishStatus: string }) {
  const [showLogs, setShowLogs] = useState(false);
  const runtime = buildDevRuntimeSnapshot({
    platformId: draft.id,
    platformName: draft.name,
    capabilityCount: snapshot.capabilityCount,
    publishStatus: snapshot.status.published ? "published" : "idle",
    publishedInRegistry: snapshot.status.published,
  });
  return (
    <SectionShell title="Runtime" subtitle="native · cloud-agent — draft runtimeTier">
      <div className="flex flex-wrap gap-2">
        {(["native", "hosted"] as const).map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => onUpdateDraft({ runtimeTier: tier })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[11px] font-semibold",
              draft.runtimeTier === tier
                ? "bg-violet-600 text-white"
                : "border border-[#e5e7eb] bg-white text-[#374151]",
            )}
          >
            {tier === "native" ? "native + cloud-agent" : "hosted + cloud-agent"}
          </button>
        ))}
      </div>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        <Stat label="Requests" value={String(runtime.requestCount)} />
        <Stat label="Errors" value={String(runtime.errorCount)} />
        <Stat label="Healthy" value={runtime.healthy ? "Yes" : "No"} ok={runtime.healthy} />
        <Stat label="Environment" value={runtime.environment} />
      </dl>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowLogs((v) => !v)}
          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[11px] font-medium text-[#374151]"
        >
          {showLogs ? "Hide logs" : "Execution logs"}
        </button>
        <button
          type="button"
          onClick={() => onOpenPane("tests")}
          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[11px] font-medium text-[#374151]"
        >
          Run tests
        </button>
      </div>
      {showLogs ? (
        <div className="mt-3 h-[280px] overflow-hidden rounded-xl border border-[#e5e7eb]">
          <HubDevLogsPanel draft={draft} />
        </div>
      ) : null}
    </SectionShell>
  );
}

export function HubDevCommerceWorkspace({ draft }: SectionWorkspaceShared) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto rimvio-scroll-touch">
      <HubDevCommercePanel draft={draft} />
    </div>
  );
}

export function HubDevHealthWorkspace({
  draft,
  snapshot,
  onOpenPane,
}: SectionWorkspaceShared) {
  const model = buildDevBlueprintModel({ draft, snapshot });
  return (
    <SectionShell title="Platform Health" subtitle={`Agent Readiness ${model.healthScore}%`}>
      <div className="flex items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <div
          className="relative flex size-16 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#10b981 ${model.healthScore * 3.6}deg, #e5e7eb 0deg)` }}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-white text-[13px] font-bold text-emerald-600">
            {model.healthScore}%
          </div>
        </div>
        <ul className="space-y-1 text-[12px]">
          {model.healthChecks.map((check) => (
            <li key={check.label} className={check.ok ? "text-emerald-700" : "text-[#9ca3af]"}>
              {check.ok ? "✓" : "○"} {check.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Jump label="Capabilities" onClick={() => onOpenPane("capabilities")} />
        <Jump label="Issues" onClick={() => onOpenPane("issues")} />
        <Jump label="Tests" onClick={() => onOpenPane("tests")} />
        <Jump label="Deploy" onClick={() => onOpenPane("deploy")} />
        <Jump label="Status" onClick={() => onOpenPane("status")} />
      </div>
    </SectionShell>
  );
}

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">{title}</p>
      <p className="mt-0.5 text-[13px] text-[#6b7280]">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] text-[#9ca3af]">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 shadow-sm">
      <p className="text-[9px] uppercase text-[#9ca3af]">{label}</p>
      <p className={cn("text-[13px] font-semibold", ok === false ? "text-amber-700" : "text-[#111827]")}>
        {value}
      </p>
    </div>
  );
}

function Jump({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[11px] font-medium text-[#374151] shadow-sm hover:border-violet-200"
    >
      {label}
    </button>
  );
}

function parseJsonArray(raw: string): string[] {
  if (!raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) =>
        typeof item === "string" ? item : JSON.stringify(item),
      );
    }
    if (parsed && typeof parsed === "object") {
      return Object.keys(parsed as Record<string, unknown>);
    }
  } catch {
    return raw
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
