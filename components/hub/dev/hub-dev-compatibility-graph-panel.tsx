"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { appendDevExecutionLog } from "@/lib/hub/dev/execution-log";
import {
  registerAdapterEntry,
  readAdapterIndex,
  subscribeAdapterIndex,
} from "@/lib/hub/dev/adapter-registry";
import {
  INFRASTRUCTURE_KINDS,
  registerInfrastructureEntry,
  readInfrastructureIndex,
  subscribeInfrastructureIndex,
  type InfrastructureKind,
} from "@/lib/hub/dev/infrastructure-registry";
import {
  resolveCapabilityCompatibilityGraph,
  validateAndExecuteCapability,
  type AdapterGraphNode,
  type CapabilityCompatibilityGraph,
  type InfrastructureGraphNode,
} from "@/lib/hub/dev/compatibility-validation-graph";
import { listPublishedRuntimes, readRuntimeIndex, subscribeRuntimeIndex } from "@/lib/hub/dev/runtime-registry";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevCompatibilityGraphPanelProps = {
  draft: PlatformDraft;
  actions: readonly CapabilityAction[];
  initialCapabilityId?: string | null;
  variant?: "full" | "compact";
  onTest?: () => void;
};

const KIND_LABEL: Record<InfrastructureKind, string> = {
  plc: "PLC",
  cloud_region: "Cloud Region",
  database: "Database",
  device_fleet: "Device Fleet",
  supplier_api: "Supplier API",
};

function LayerHeader({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/10 text-[11px] font-bold text-[#6366f1]">
        {step}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-[#0f172a]">{title}</p>
        <p className="text-[11px] text-[#64748b]">{subtitle}</p>
      </div>
    </div>
  );
}

function InfraCard({
  node,
  runtimeNames,
  selected,
  onSelect,
}: {
  node: InfrastructureGraphNode;
  runtimeNames: Map<string, string>;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-[#6366f1] bg-[#eef2ff]"
          : node.compatible
            ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300"
            : "border-[#E2E8F0] bg-white hover:border-[#cbd5e1]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#0f172a]">
            {node.compatible ? "✓" : "✕"} {node.name}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#64748b]">{node.id}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium",
            node.matchesSpecKind ? "bg-[#eef2ff] text-[#6366f1]" : "bg-[#f1f5f9] text-[#94a3b8]",
          )}
        >
          {KIND_LABEL[node.kind]}
        </span>
      </div>
      <p className="mt-1.5 text-[10px] text-[#64748b]">
        Owner {node.ownerCreatorId} · {node.reasonKo}
      </p>
      {node.compatibleRuntimeIds.length > 0 ? (
        <p className="mt-1 text-[10px] text-[#475569]">
          Runtimes:{" "}
          {node.compatibleRuntimeIds
            .map((id) => runtimeNames.get(id) ?? id)
            .join(" · ")}
        </p>
      ) : null}
      {node.linkedAdapterIds.length > 0 ? (
        <p className="mt-0.5 font-mono text-[9px] text-[#94a3b8]">
          Adapters: {node.linkedAdapterIds.join(", ")}
        </p>
      ) : null}
    </button>
  );
}

function AdapterRow({ node }: { node: AdapterGraphNode }) {
  return (
    <li
      className={cn(
        "rounded-lg border px-3 py-2 text-[11px]",
        node.compatible
          ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
          : "border-[#E2E8F0] bg-white text-[#64748b]",
      )}
    >
      <p className="font-medium">
        {node.compatible ? "✓" : "✕"} {node.name}
      </p>
      <p className="mt-0.5 font-mono text-[10px] opacity-80">
        {node.runtimeId} → {node.infrastructureId}
      </p>
      <p className="mt-0.5 text-[10px]">{node.reasonKo}</p>
    </li>
  );
}

export function CompatibilityGraphLayers({
  graph,
  draft,
  variant = "full",
  runtimeNames,
}: {
  graph: CapabilityCompatibilityGraph;
  draft: PlatformDraft;
  variant?: "full" | "compact";
  runtimeNames: Map<string, string>;
}) {
  const requiredKinds = graph.specification.requirements.infrastructureKinds;
  const compact = variant === "compact";

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {!compact && requiredKinds.length > 0 ? (
        <div className="rounded-lg border border-[#E2E8F0] bg-[#f8fafc] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-[#64748b]">Spec requires</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {requiredKinds.map((kind) => (
              <span
                key={kind}
                className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-[#475569] ring-1 ring-[#E2E8F0]"
              >
                {kind}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <section>
        {!compact ? (
          <LayerHeader
            step={1}
            title="Infrastructure"
            subtitle="외부 API · DB · PLC — Capability Spec 종류와 Runtime 연결 검증"
          />
        ) : (
          <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Infrastructure</p>
        )}
        <ul className={cn("mt-2 space-y-2", compact && "mt-1.5 space-y-1")}>
          {graph.infrastructure.length === 0 ? (
            <li className="text-[11px] text-[#94a3b8]">등록된 Infrastructure 없음</li>
          ) : compact ? (
            graph.infrastructure.slice(0, 4).map((row) => (
              <li
                key={row.id}
                className={cn(
                  "flex justify-between gap-2 rounded px-2 py-1 text-[11px]",
                  row.compatible ? "text-emerald-300" : "text-[#6b7684]",
                )}
              >
                <span>
                  {row.compatible ? "✓" : "✕"} {row.name}
                </span>
                <span className="text-[9px] opacity-80">{row.reasonKo}</span>
              </li>
            ))
          ) : (
            graph.infrastructure.map((row) => (
              <li key={row.id}>
                <InfraCard
                  node={row}
                  runtimeNames={runtimeNames}
                  selected={false}
                  onSelect={() => {}}
                />
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        {!compact ? (
          <LayerHeader
            step={2}
            title="Adapter"
            subtitle="Infrastructure → Rimvio Interface 브리지"
          />
        ) : (
          <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Adapter</p>
        )}
        <ul className={cn("mt-2 space-y-2", compact && "mt-1.5 space-y-1")}>
          {graph.adapters.length === 0 ? (
            <li className="text-[11px] text-[#94a3b8]">—</li>
          ) : compact ? (
            graph.adapters.slice(0, 4).map((row) => (
              <li
                key={row.id}
                className={cn(
                  "flex justify-between gap-2 rounded px-2 py-1 text-[11px]",
                  row.compatible ? "text-emerald-300" : "text-[#6b7684]",
                )}
              >
                <span>
                  {row.compatible ? "✓" : "✕"} {row.name}
                </span>
                <span className="text-[9px] opacity-80">{row.reasonKo}</span>
              </li>
            ))
          ) : (
            graph.adapters.map((row) => (
              <li key={row.id}>
                <AdapterRow node={row} />
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        {!compact ? (
          <LayerHeader
            step={3}
            title="Capability"
            subtitle={`${draft.name} · Specification contract`}
          />
        ) : null}
        <div
          className={cn(
            "rounded-xl border px-3 py-2",
            compact
              ? "border-white/[0.08] bg-[#151820]"
              : "mt-2 border-[#6366f1]/30 bg-[#eef2ff]",
          )}
        >
          <p
            className={cn(
              "font-mono font-bold",
              compact ? "text-[13px] text-[#f2f4f6]" : "text-[14px] text-[#312e81]",
            )}
          >
            {graph.capabilityId}
          </p>
          {!compact ? (
            <p className="mt-1 text-[11px] text-[#4338ca]">
              {graph.specification.intent.summaryKo}
            </p>
          ) : null}
        </div>
      </section>

      <section>
        {!compact ? (
          <LayerHeader step={4} title="Runtime" subtitle="Router-ranked execution environment" />
        ) : (
          <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Runtime (Router)</p>
        )}
        <ul className={cn("mt-2 space-y-1 text-[11px]", compact && "mt-1.5")}>
          {graph.runtimes.length === 0 ? (
            <li className={compact ? "text-[#6b7684]" : "text-[#94a3b8]"}>No eligible runtime</li>
          ) : (
            graph.runtimes.slice(0, compact ? 3 : 5).map(({ runtime, scores }, index) => (
              <li
                key={runtime.id}
                className={cn(
                  "rounded px-2 py-1",
                  index === 0
                    ? compact
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : compact
                      ? "text-[#8b95a1]"
                      : "text-[#64748b]",
                )}
              >
                {index === 0 ? "✓" : "·"} {runtime.name} · {(scores.composite * 100).toFixed(0)}%
                {!compact && runtime.operational ? (
                  <span className="ml-1 text-[10px] opacity-70">
                    · {runtime.operational.latencyMsP50}ms · health{" "}
                    {(runtime.operational.healthScore * 100).toFixed(1)}%
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function CreateInfrastructureForm({
  ownerId,
  onCreated,
}: {
  ownerId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<InfrastructureKind>("supplier_api");
  const [runtimeIds, setRuntimeIds] = useState<string[]>(["rimvio.browser-runtime"]);
  const runtimes = listPublishedRuntimes();

  const toggleRuntime = (id: string) => {
    setRuntimeIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || runtimeIds.length === 0) return;
    registerInfrastructureEntry({
      name: name.trim(),
      kind,
      ownerCreatorId: ownerId,
      compatibleRuntimeIds: runtimeIds,
    });
    setName("");
    setOpen(false);
    onCreated();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg border border-dashed border-[#6366f1]/40 py-2 text-[11px] font-medium text-[#6366f1] hover:bg-[#eef2ff]"
      >
        + Register Infrastructure
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold text-[#334155]">New Infrastructure</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Tokyo Hotel API"
        className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[12px]"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as InfrastructureKind)}
        className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[12px]"
      >
        {INFRASTRUCTURE_KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_LABEL[k]}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[10px] font-medium text-[#64748b]">Compatible Runtimes</p>
      <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto">
        {runtimes.map((r) => (
          <li key={r.id}>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#475569]">
              <input
                type="checkbox"
                checked={runtimeIds.includes(r.id)}
                onChange={() => toggleRuntime(r.id)}
              />
              {r.name}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-lg bg-[#6366f1] px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          Register
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[11px] text-[#64748b]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CreateAdapterForm({
  ownerId,
  graph,
  onCreated,
}: {
  ownerId: string;
  graph: CapabilityCompatibilityGraph;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [runtimeId, setRuntimeId] = useState(graph.selectedRuntimeId ?? "rimvio.browser-runtime");
  const [infrastructureId, setInfrastructureId] = useState(
    graph.infrastructure.find((i) => i.compatible)?.id ?? "",
  );

  const handleSubmit = () => {
    if (!infrastructureId || !runtimeId) return;
    const infra = graph.infrastructure.find((i) => i.id === infrastructureId);
    const runtime = graph.runtimes.find((r) => r.runtime.id === runtimeId)?.runtime;
    registerAdapterEntry({
      name: `${runtime?.name ?? runtimeId} → ${infra?.name ?? infrastructureId}`,
      runtimeId,
      infrastructureId,
      ownerCreatorId: ownerId,
      status: "published",
    });
    setOpen(false);
    onCreated();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-medium text-[#475569] hover:bg-white"
      >
        + Link Adapter
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-[#E2E8F0] bg-white p-3">
      <p className="text-[11px] font-semibold text-[#334155]">New Adapter edge</p>
      <select
        value={runtimeId}
        onChange={(e) => setRuntimeId(e.target.value)}
        className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-[11px]"
      >
        {graph.runtimes.map(({ runtime }) => (
          <option key={runtime.id} value={runtime.id}>
            {runtime.name}
          </option>
        ))}
      </select>
      <select
        value={infrastructureId}
        onChange={(e) => setInfrastructureId(e.target.value)}
        className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-[11px]"
      >
        <option value="">Select infrastructure</option>
        {graph.infrastructure.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name} ({KIND_LABEL[i.kind]})
          </option>
        ))}
      </select>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-lg bg-[#6366f1] px-3 py-1 text-[11px] font-semibold text-white"
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-[#64748b]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function HubDevCompatibilityGraphPanel({
  draft,
  actions,
  initialCapabilityId,
  variant = "full",
  onTest,
}: HubDevCompatibilityGraphPanelProps) {
  const ownerId = draft.operator?.name ?? draft.name;
  const [revision, bumpRevision] = useState(0);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(
    () => initialCapabilityId ?? actions[0]?.id ?? null,
  );
  const [tested, setTested] = useState(false);
  const [lastDetail, setLastDetail] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      subscribeInfrastructureIndex(() => bumpRevision((n) => n + 1)),
      subscribeAdapterIndex(() => bumpRevision((n) => n + 1)),
      subscribeRuntimeIndex(() => bumpRevision((n) => n + 1)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const action = actions.find((a) => a.id === selectedActionId) ?? actions[0] ?? null;

  const runtimeNames = useMemo(
    () => new Map(readRuntimeIndex().map((r) => [r.id, r.name])),
    [revision],
  );

  const graph = useMemo(() => {
    if (!action) return null;
    return resolveCapabilityCompatibilityGraph({
      capabilityId: action.name,
      platformId: draft.id,
      utterance: action.description,
      action,
      draft,
    });
  }, [action, draft, revision]);

  const handleTest = useCallback(async () => {
    if (!action || !graph) return;
    const result = await validateAndExecuteCapability({
      capabilityId: action.name,
      platformId: draft.id,
      platformName: draft.name,
      utterance: action.description,
      action,
      draft,
      approvalPolicy: action.approvalRequired ? "user_required" : "none",
    });
    setLastDetail(result.detailKo);
    appendDevExecutionLog({
      platformId: draft.id,
      platformName: draft.name,
      capabilityId: action.name,
      source: "compatibility-graph-test",
      ok: result.routerOk && result.graph.graphValid,
      detail: result.detailKo,
      durationMs: result.durationMs,
      output: {
        runtimeId: result.runtimeId,
        graphValid: result.graph.graphValid,
      },
    });
    setTested(true);
    onTest?.();
  }, [action, draft, graph, onTest]);

  if (variant === "compact" && graph && action) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#151820] p-4">
        <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Compatibility Graph</p>
        <p className="mt-1 font-mono text-[13px] font-bold text-[#f2f4f6]">{action.name}</p>
        <CompatibilityGraphLayers
          graph={graph}
          draft={draft}
          variant="compact"
          runtimeNames={runtimeNames}
        />
        <p
          className={cn(
            "mt-4 text-[11px] font-medium",
            graph.graphValid ? "text-emerald-400" : "text-amber-400",
          )}
        >
          {graph.summaryKo}
        </p>
        <button
          type="button"
          onClick={() => void handleTest()}
          className="mt-4 w-full rounded-lg bg-[#4593fc] py-2 text-[11px] font-semibold text-white"
        >
          Test Compatibility + Execute
        </button>
        {tested && lastDetail ? (
          <p className="mt-2 text-[10px] text-emerald-400">✓ {lastDetail}</p>
        ) : null}
      </div>
    );
  }

  if (!action || !graph) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-[#64748b]">
        Capability를 먼저 AI Build에서 생성하세요.
      </div>
    );
  }

  const compatibleInfra = graph.infrastructure.filter((i) => i.compatible).length;

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Hub · ADR-064</p>
      <h2 className="mt-1 text-[20px] font-bold text-[#0f172a]">Compatibility Graph</h2>
      <p className="mt-1 max-w-2xl text-[12px] text-[#64748b]">
        Infrastructure → Adapter → Capability → Runtime 전체 체인을 검증합니다. Agent에는{" "}
        <strong>Published Capability</strong>만 노출됩니다.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1">
          <span className="text-[10px] font-semibold uppercase text-[#64748b]">Capability</span>
          <select
            value={action.id}
            onChange={(e) => {
              setSelectedActionId(e.target.value);
              setTested(false);
              setLastDetail(null);
            }}
            className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 font-mono text-[12px]"
          >
            {actions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2">
          <p className="text-[10px] text-[#64748b]">Graph status</p>
          <p
            className={cn(
              "text-[14px] font-bold",
              graph.graphValid ? "text-emerald-600" : "text-amber-600",
            )}
          >
            {graph.summaryKo}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2">
          <p className="text-[10px] text-[#64748b]">Infrastructure</p>
          <p className="text-[14px] font-bold text-[#0f172a]">
            {compatibleInfra}/{graph.infrastructure.length} compatible
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <CompatibilityGraphLayers
            graph={graph}
            draft={draft}
            variant="full"
            runtimeNames={runtimeNames}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-[11px] font-semibold text-[#334155]">Infrastructure Store</p>
            <p className="mt-1 text-[10px] text-[#64748b]">
              Hub에 Infrastructure를 등록하면 Adapter·Capability Spec과 연결됩니다.
            </p>
            <CreateInfrastructureForm ownerId={ownerId} onCreated={() => bumpRevision((n) => n + 1)} />
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-[11px] font-semibold text-[#334155]">Adapter edge</p>
            <CreateAdapterForm
              ownerId={ownerId}
              graph={graph}
              onCreated={() => bumpRevision((n) => n + 1)}
            />
          </div>

          <button
            type="button"
            onClick={() => void handleTest()}
            className="w-full rounded-xl bg-[#6366f1] py-3 text-[12px] font-semibold text-white shadow-sm hover:bg-[#4f46e5]"
          >
            Validate + Execute
          </button>
          {tested && lastDetail ? (
            <p className="text-[11px] text-emerald-700">✓ {lastDetail}</p>
          ) : null}
        </aside>
      </div>

      <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <p className="text-[11px] font-semibold text-[#334155]">Registry snapshot</p>
        <dl className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
          <div>
            <dt className="text-[#64748b]">Infrastructure index</dt>
            <dd className="font-mono text-[#0f172a]">{readInfrastructureIndex().length} entries</dd>
          </div>
          <div>
            <dt className="text-[#64748b]">Adapter index</dt>
            <dd className="font-mono text-[#0f172a]">{readAdapterIndex().length} entries</dd>
          </div>
          <div>
            <dt className="text-[#64748b]">Selected runtime</dt>
            <dd className="font-mono text-[#0f172a]">{graph.selectedRuntimeId ?? "—"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
