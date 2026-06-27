"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { buildContextSnapshot } from "@/lib/dev/build-context-snapshot";
import { detectContextAlerts } from "@/lib/dev/detect-context-alerts";
import type {
  ContextAlert,
  ContextGraphNode,
  ContextLiveStreamRow,
  ContextSnapshot,
} from "@/lib/dev/context-snapshot-types";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import {
  listConversationMemories,
} from "@/lib/conversation-memory/conversation-memory-store";
import { listPersonalGlobePins } from "@/lib/globe/personal-globe-pin-store";

type ServerPayload = {
  ok: boolean;
  server?: {
    builtAt: string;
    liveStream: ContextLiveStreamRow[];
    externalPinRows: Array<{
      event_id: string;
      visibility: "private" | "external";
    }>;
    external: ContextSnapshot["external"];
  };
};

function KpiCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-2.5 shadow-sm",
        warn ? "bg-destructive/10 text-destructive" : "bg-muted/60",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function AlertBadge({ alert }: { alert: ContextAlert }) {
  const tone =
    alert.severity === "high"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : alert.severity === "medium"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
        : "border-muted bg-muted/50 text-muted-foreground";

  return (
    <div className={cn("rounded-xl border px-3 py-2 text-sm", tone)}>
      <p className="font-semibold">{alert.title}</p>
      <p className="mt-0.5 text-xs opacity-80">{alert.detail}</p>
    </div>
  );
}

function LiveStreamRow({
  row,
  expanded,
  onToggle,
}: {
  row: ContextLiveStreamRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-1 px-3 py-2.5 text-left active:scale-[0.995]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {new Date(row.timestamp).toLocaleString("ko-KR")}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {expanded ? "collapse" : "lineage"}
          </span>
        </div>
        <p className="text-sm font-medium">{row.userMessage}</p>
        {row.assistantSummary ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {row.assistantSummary}
          </p>
        ) : null}
      </button>
      {expanded ? (
        <div className="space-y-2 border-t border-border/50 px-3 py-2.5 text-xs">
          <div>
            <p className="font-semibold text-muted-foreground">Event Kernel</p>
            <p>{row.lineage.eventKernel ?? "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Unified Context</p>
            <p className="whitespace-pre-wrap">
              {row.lineage.unifiedContext ?? "—"}
            </p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Pipeline</p>
            <p>{row.lineage.pipeline ?? "—"}</p>
          </div>
          {row.orchestratorTrace.length > 0 ? (
            <div>
              <p className="font-semibold text-muted-foreground">Trace</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {row.orchestratorTrace.slice(-6).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ContextOpsPanel() {
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ContextSnapshot | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [graphQuery, setGraphQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<ContextGraphNode | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dev/context-snapshot");
      if (!response.ok) {
        throw new Error(`snapshot ${response.status}`);
      }
      const payload = (await response.json()) as ServerPayload;

      const events = listLifeEventCandidates();
      const contacts = readPeerContacts();
      const memories = listConversationMemories(40).map((item) => ({
        id: item.id,
        topic: item.topic,
        summary: item.summary,
        keywords: item.keywords,
        createdAt: item.createdAt,
      }));
      const localPinEventIds = listPersonalGlobePins()
        .map((pin) => pin.eventId?.trim())
        .filter((id): id is string => Boolean(id));

      const merged = buildContextSnapshot({
        events,
        contacts,
        conversationMemories: memories,
        localPinEventIds,
        externalPinRows: payload.server?.externalPinRows ?? [],
        liveTurns: undefined,
      });

      if (payload.server?.liveStream?.length) {
        merged.liveStream = payload.server.liveStream;
      }

      if (payload.server?.external) {
        merged.external = {
          ...merged.external,
          externalPinCount: payload.server.external.externalPinCount,
          orphanExternalPins: [
            ...merged.external.orphanExternalPins,
            ...payload.server.external.orphanExternalPins,
          ].filter(
            (row, index, arr) =>
              arr.findIndex((item) => item.id === row.id) === index,
          ),
          orphanExternalEvents: merged.external.orphanExternalEvents,
        };
      }

      merged.alerts = detectContextAlerts({
        internal: merged.internal,
        external: merged.external,
        liveStream: merged.liveStream,
      });

      setSnapshot(merged);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  const graphHighlight = useMemo(() => {
    const query = graphQuery.trim().toLowerCase();
    if (!query || !snapshot) {
      return new Set<string>();
    }
    const hits = snapshot.graph.nodes.filter((node) =>
      node.searchTokens.some((token) => token.includes(query)) ||
      node.label.toLowerCase().includes(query),
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
      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Context Ops 로딩 중…</p>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-sm text-destructive">Context Ops: {error}</p>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const orphanCount =
    snapshot.external.orphanExternalPins.length +
    snapshot.external.orphanExternalEvents.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Context Ops
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Palantir-style · 내 지구 SSOT · 밖 지구 projection · live lineage
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVersion((v) => v + 1)}
          className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium"
        >
          Refresh
        </button>
      </div>

      {snapshot.alerts.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Alerts
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {snapshot.alerts.map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Floor 1 · Live Stream
        </p>
        {snapshot.liveStream.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            live turn 로그 없음 — 채팅 orchestrate 후 `.cursor/rimvio-live-turns.jsonl` 확인
          </p>
        ) : (
          <div className="space-y-2">
            {snapshot.liveStream.slice(0, 12).map((row) => (
              <LiveStreamRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() =>
                  setExpandedId((current) =>
                    current === row.id ? null : row.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Floor 2 · Dual Globe
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold">내 지구 (SSOT)</p>
            <div className="grid grid-cols-2 gap-2">
              <KpiCard label="Events" value={snapshot.internal.eventCount} />
              <KpiCard label="People" value={snapshot.internal.peopleCount} />
              <KpiCard label="Memories" value={snapshot.internal.conversationMemoryCount} />
              <KpiCard
                label="Trajectory"
                value={snapshot.internal.dominantTrajectoryCluster ?? "—"}
              />
              <KpiCard label="Local pins" value={snapshot.internal.internalPinCount} />
              <KpiCard
                label="External-marked events"
                value={snapshot.internal.externalVisibilityEventCount}
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">밖 지구 (Projection)</p>
            <div className="grid grid-cols-2 gap-2">
              <KpiCard
                label="External pins"
                value={snapshot.external.externalPinCount}
              />
              <KpiCard
                label="Orphans"
                value={orphanCount}
                warn={orphanCount > 0}
              />
            </div>
            {orphanCount > 0 ? (
              <ul className="space-y-1 text-xs text-destructive">
                {[
                  ...snapshot.external.orphanExternalPins,
                  ...snapshot.external.orphanExternalEvents,
                ].map((row) => (
                  <li key={`${row.kind}-${row.id}`}>
                    {row.label} — {row.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Floor 3 · Context Graph
        </p>
        <input
          type="search"
          value={graphQuery}
          onChange={(event) => setGraphQuery(event.target.value)}
          placeholder='검색 — 예: "정성", place, travel…'
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
        />
        <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
          {snapshot.graph.nodes.map((node) => {
            const highlighted =
              graphQuery.trim().length === 0 || graphHighlight.has(node.id);
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedNode(node)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-left text-xs transition-opacity",
                  highlighted ? "bg-primary/10 opacity-100" : "opacity-25",
                  selectedNode?.id === node.id && "ring-1 ring-primary",
                )}
              >
                <span className="font-medium">{node.label}</span>
                <span className="ml-1 text-muted-foreground">· {node.kind}</span>
              </button>
            );
          })}
        </div>
        {selectedNode ? (
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
            <p className="font-semibold">{selectedNode.label}</p>
            <p className="text-xs text-muted-foreground">{selectedNode.kind}</p>
            {selectedNode.detail ? (
              <p className="mt-1 text-xs">{selectedNode.detail}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              연결:{" "}
              {
                snapshot.graph.edges.filter(
                  (edge) =>
                    edge.from === selectedNode.id ||
                    edge.to === selectedNode.id,
                ).length
              }
            </p>
          </div>
        ) : null}
      </section>

      <p className="text-[11px] text-muted-foreground">
        Built {new Date(snapshot.builtAt).toLocaleString("ko-KR")}
      </p>
    </div>
  );
}
