"use client";

import { useMemo, useState } from "react";
import { Activity, AlertCircle, Radio, RefreshCw } from "lucide-react";
import type {
  ContextAlert,
  ContextGraphNode,
  ContextLiveStreamRow,
} from "@/lib/dev/context-snapshot-types";
import { useContextOpsSnapshot } from "@/hooks/use-context-ops-snapshot";
import { collectBehaviorSignals } from "@/lib/intent/collect-behavior-signals";
import { readSaveTrajectory } from "@/lib/intent/save-trajectory-client";
import { cn } from "@/lib/utils";

type DashboardTab = "stream" | "lineage" | "graph";

const NODE_COLORS: Record<ContextGraphNode["kind"], string> = {
  event: "#3182f6",
  person: "#34c759",
  place: "#ff9500",
  memory: "#bf5af2",
  pin: "#86868b",
  external: "#ff3b30",
};

function KpiTile({
  label,
  value,
  sub,
  delta,
  warn,
}: {
  label: string;
  value: string | number;
  sub: string;
  delta?: string | null;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e8ecf0] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8b95a1]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-[28px] font-bold tabular-nums leading-none tracking-tight",
          warn ? "text-[#ff3b30]" : "text-[#191f28]",
        )}
      >
        {value}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-[#6b7684]">{sub}</p>
        {delta ? (
          <span className="shrink-0 text-[11px] font-semibold text-[#34c759]">{delta}</span>
        ) : null}
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: ContextAlert }) {
  const dot =
    alert.severity === "high"
      ? "bg-[#ff3b30]"
      : alert.severity === "medium"
        ? "bg-[#ff9500]"
        : "bg-[#34c759]";

  return (
    <div className="flex gap-2.5 rounded-xl border border-[#eef1f4] bg-white px-3 py-2.5">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot)} aria-hidden />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#191f28]">{alert.title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-[#6b7684]">{alert.detail}</p>
      </div>
    </div>
  );
}

function ContextGraphCanvas({
  nodes,
  edges,
  highlightIds,
}: {
  nodes: ContextGraphNode[];
  edges: { from: string; to: string }[];
  highlightIds: Set<string>;
}) {
  const layout = useMemo(() => {
    const width = 520;
    const height = 280;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;
    const positions = new Map<string, { x: number; y: number }>();

    nodes.slice(0, 24).forEach((node, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions.set(node.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });

    return { width, height, positions };
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#d1d6db] bg-[#fafbfc] text-sm text-[#8b95a1]">
        그래프 노드 없음 — 맥락·사람·메모리를 쌓으면 연결됩니다
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="h-[280px] w-full rounded-2xl border border-[#eef1f4] bg-[#fafbfc]"
      role="img"
      aria-label="Context graph"
    >
      {edges.map((edge) => {
        const from = layout.positions.get(edge.from);
        const to = layout.positions.get(edge.to);
        if (!from || !to) {
          return null;
        }
        const dim =
          highlightIds.size > 0 &&
          !highlightIds.has(edge.from) &&
          !highlightIds.has(edge.to);
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#c7cdd3"
            strokeWidth={1}
            opacity={dim ? 0.15 : 0.7}
            markerEnd="url(#arrow)"
          />
        );
      })}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#c7cdd3" />
        </marker>
      </defs>
      {nodes.slice(0, 24).map((node) => {
        const pos = layout.positions.get(node.id);
        if (!pos) {
          return null;
        }
        const dim = highlightIds.size > 0 && !highlightIds.has(node.id);
        const color = NODE_COLORS[node.kind] ?? "#86868b";
        return (
          <g key={node.id} opacity={dim ? 0.2 : 1}>
            <circle cx={pos.x} cy={pos.y} r={10} fill={color} />
            <text
              x={pos.x}
              y={pos.y + 18}
              textAnchor="middle"
              className="fill-[#4e5968] text-[8px]"
            >
              {node.label.slice(0, 10)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StreamRow({
  row,
  mode,
}: {
  row: ContextLiveStreamRow;
  mode: "stream" | "lineage";
}) {
  return (
    <div className="rounded-xl border border-[#eef1f4] bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] tabular-nums text-[#8b95a1]">
          {new Date(row.timestamp).toLocaleString("ko-KR")}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[#b0b8c1]">
          {row.routing?.ai_intent ?? "—"}
        </span>
      </div>
      <p className="mt-1 text-[13px] font-medium text-[#191f28]">{row.userMessage}</p>
      {mode === "lineage" ? (
        <div className="mt-2 space-y-1.5 border-t border-[#f2f4f6] pt-2 text-[11px] text-[#4e5968]">
          <p>
            <span className="font-semibold text-[#8b95a1]">Event Kernel · </span>
            {row.lineage.eventKernel ?? "—"}
          </p>
          <p>
            <span className="font-semibold text-[#8b95a1]">Unified · </span>
            {row.lineage.unifiedContext ?? "—"}
          </p>
          <p>
            <span className="font-semibold text-[#8b95a1]">Pipeline · </span>
            {row.lineage.pipeline ?? "—"}
          </p>
        </div>
      ) : row.assistantSummary ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-[#6b7684]">{row.assistantSummary}</p>
      ) : null}
    </div>
  );
}

/** Palantir-style Context Ops — dev-only pipeline observability. */
export function ContextOpsDashboard() {
  const { loading, error, snapshot, kpis, refresh } = useContextOpsSnapshot(30_000);
  const [tab, setTab] = useState<DashboardTab>("graph");
  const [graphQuery, setGraphQuery] = useState("");
  const [expandedStreamId, setExpandedStreamId] = useState<string | null>(null);

  const behavior = useMemo(() => {
    const saveHistory = readSaveTrajectory();
    return collectBehaviorSignals({ saveHistory, hour: new Date().getHours() });
  }, [snapshot?.builtAt]);

  const graphHighlight = useMemo(() => {
    const query = graphQuery.trim().toLowerCase();
    if (!query || !snapshot) {
      return new Set<string>();
    }
    const hits = snapshot.graph.nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.searchTokens.some((token) => token.includes(query)),
    );
    const ids = new Set(hits.map((node) => node.id));
    for (const edge of snapshot.graph.edges) {
      if (ids.has(edge.from) || ids.has(edge.to)) {
        ids.add(edge.from);
        ids.add(edge.to);
      }
    }
    return ids;
  }, [graphQuery, snapshot]);

  if (loading && !snapshot) {
    return (
      <div className="rounded-3xl border border-[#eef1f4] bg-white p-8 text-center text-sm text-[#8b95a1]">
        Context Ops 연결 중…
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="rounded-3xl border border-[#ff3b30]/30 bg-[#fff5f5] p-6 text-sm text-[#ff3b30]">
        Context Ops 로드 실패: {error}
      </div>
    );
  }

  if (!snapshot || !kpis) {
    return null;
  }

  const builtAgoSec = Math.max(
    0,
    Math.round((Date.now() - Date.parse(snapshot.builtAt)) / 1000),
  );
  const recallDisplay =
    kpis.recallHitRatePct != null ? `${kpis.recallHitRatePct}%` : "—";

  return (
    <div
      className="overflow-hidden rounded-[1.25rem] border border-[#e8ecf0] bg-[#f5f6f8] shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
      data-context-ops-dashboard
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ecf0] bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold tracking-tight text-[#191f28]">
            RIMVIO <span className="text-[#8b95a1]">|</span> Context Ops
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34c759]/10 px-2.5 py-1 text-[11px] font-semibold text-[#248a3d]">
            <Radio className="size-3 animate-pulse" aria-hidden />
            라이브
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#3182f6]/10 px-2.5 py-1 text-[11px] font-semibold text-[#3182f6]">
            UnifiedContext ✓
          </span>
          {snapshot.alerts.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ff9500]/12 px-2.5 py-1 text-[11px] font-semibold text-[#c93400]">
              <AlertCircle className="size-3" aria-hidden />
              알림 {snapshot.alerts.length}
            </span>
          ) : null}
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1 rounded-full border border-[#e8ecf0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4e5968] active:scale-[0.98]"
          >
            <RefreshCw className="size-3" aria-hidden />
            새로고침
          </button>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid gap-3 border-b border-[#e8ecf0] bg-[#fafbfc] px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="활성 맥락"
          value={kpis.activeContextCount}
          sub="EventCandidate"
          delta={kpis.eventsTodayDelta > 0 ? `+${kpis.eventsTodayDelta} 오늘` : null}
        />
        <KpiTile
          label="Recall 적중률"
          value={recallDisplay}
          sub="conversationMemory"
          delta={
            kpis.recallUtteranceCount > 0
              ? `${kpis.recallHitCount}/${kpis.recallUtteranceCount}턴`
              : `${kpis.conversationMemoryCount}건 저장`
          }
        />
        <KpiTile
          label="People Graph"
          value={kpis.peopleGraphCount}
          sub={`contact ${kpis.contactCount} · discovered ${kpis.discoveredPeopleCount}`}
        />
        <KpiTile
          label="Pins 발행"
          value={kpis.externalPinCount}
          sub="external"
          warn={kpis.orphanCount > 0}
          delta={kpis.orphanCount > 0 ? `orphan ${kpis.orphanCount}` : null}
        />
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
        {/* Main panel */}
        <div className="border-b border-[#e8ecf0] bg-white p-5 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(
              [
                ["stream", "Live Stream"],
                ["lineage", "Lineage"],
                ["graph", "Graph"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  tab === id
                    ? "bg-[#191f28] text-white"
                    : "bg-[#f2f4f6] text-[#6b7684]",
                )}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <input
                type="search"
                value={graphQuery}
                onChange={(event) => setGraphQuery(event.target.value)}
                placeholder="정성 / 부산 / eventId…"
                className="w-[min(100%,14rem)] rounded-lg border border-[#e8ecf0] bg-[#fafbfc] px-3 py-1.5 text-[12px]"
              />
              <button
                type="button"
                onClick={() => setGraphQuery("")}
                className="rounded-lg border border-[#e8ecf0] px-2.5 py-1.5 text-[11px] text-[#6b7684]"
              >
                초기화
              </button>
            </div>
          </div>

          {tab === "graph" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-[10px] text-[#6b7684]">
                {(
                  Object.entries(NODE_COLORS) as [ContextGraphNode["kind"], string][]
                ).map(([kind, color]) => (
                  <span key={kind} className="inline-flex items-center gap-1">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    {kind}
                  </span>
                ))}
              </div>
              <ContextGraphCanvas
                nodes={snapshot.graph.nodes}
                edges={snapshot.graph.edges}
                highlightIds={graphHighlight}
              />
            </div>
          ) : (
            <div className="max-h-[320px] space-y-2 overflow-y-auto">
              {snapshot.liveStream.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[#8b95a1]">
                  live turn 없음 — 채팅 후 `.cursor/rimvio-live-turns.jsonl` 확인
                </p>
              ) : (
                snapshot.liveStream.slice(0, 16).map((row) => (
                  <div key={row.id}>
                    <StreamRow
                      row={row}
                      mode={tab === "lineage" ? "lineage" : "stream"}
                    />
                    {tab === "stream" && expandedStreamId === row.id ? (
                      <div className="mt-1 rounded-lg bg-[#f8f9fb] px-3 py-2 text-[11px] text-[#4e5968]">
                        {row.lineage.unifiedContext ?? row.lineage.pipeline ?? "—"}
                      </div>
                    ) : null}
                    {tab === "stream" ? (
                      <button
                        type="button"
                        className="mt-0.5 text-[10px] text-[#3182f6]"
                        onClick={() =>
                          setExpandedStreamId((current) =>
                            current === row.id ? null : row.id,
                          )
                        }
                      >
                        {expandedStreamId === row.id ? "접기" : "lineage"}
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 bg-[#fafbfc] p-4">
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b95a1]">
              Alerts
            </p>
            <div className="space-y-2">
              {snapshot.alerts.length === 0 ? (
                <div className="rounded-xl border border-[#34c759]/30 bg-[#34c759]/8 px-3 py-2 text-[12px] text-[#248a3d]">
                  Pipeline 정상 · Trajectory 연결 정상
                </div>
              ) : (
                snapshot.alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)
              )}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b95a1]">
              Projection health
            </p>
            <p className="mb-2 text-[10px] leading-snug text-[#b0b8c1]">
              pin ↔ EventCandidate 연결만 관측. Field 거래 UI는 여기 없음.
            </p>
            <ul className="space-y-1.5 text-[12px] text-[#4e5968]">
              <li className="flex justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-[#eef1f4]">
                <span>External pins</span>
                <span className="font-semibold tabular-nums">{kpis.externalPinCount}</span>
              </li>
              <li className="flex justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-[#eef1f4]">
                <span>Private pins</span>
                <span className="font-semibold tabular-nums">
                  {snapshot.external.privatePinCount}
                </span>
              </li>
              <li className="flex justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-[#eef1f4]">
                <span>Orphan links</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    kpis.orphanCount > 0 && "text-[#ff3b30]",
                  )}
                >
                  {kpis.orphanCount}
                </span>
              </li>
            </ul>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b95a1]">
              Behavior Kernel
            </p>
            <ul className="space-y-1.5 text-[12px]">
              <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-[#eef1f4]">
                <span className="text-[#6b7684]">dominant cluster</span>
                <span className="rounded-md bg-[#3182f6]/10 px-2 py-0.5 text-[11px] font-semibold text-[#3182f6]">
                  {behavior.trajectory.dominant_cluster}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-[#eef1f4]">
                <span className="text-[#6b7684]">cross_link</span>
                <span className="font-medium text-[#191f28]">
                  {behavior.cross_link.pattern ?? "—"}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-[#eef1f4]">
                <span className="text-[#6b7684]">trajectory saves</span>
                <span className="tabular-nums text-[#191f28]">
                  {snapshot.internal.saveTrajectoryCount}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-[#eef1f4]">
                <span className="text-[#6b7684]">burst session</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34c759]">
                  <Activity className="size-3" aria-hidden />
                  {behavior.interaction_mode}
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8ecf0] bg-white px-5 py-2.5 text-[11px] text-[#8b95a1]">
        <span>
          ● 실시간 연결됨 · 턴 {snapshot.liveStream.length}개 · {builtAgoSec}초 전 업데이트
        </span>
        <span className="text-[#b0b8c1]">
          Context Ops tier · Field는 bottom-nav 맞춤
        </span>
      </footer>
    </div>
  );
}
