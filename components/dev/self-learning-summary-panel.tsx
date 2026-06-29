"use client";

import { useSelfLearningSummary } from "@/hooks/use-self-learning-summary";
import type { SelfLearningBarRow, SelfLearningDayBucket } from "@/lib/dev/summarize-self-learning";
import { cn } from "@/lib/utils";

function MiniBarChart({
  buckets,
  emptyLabel,
}: {
  buckets: readonly SelfLearningDayBucket[];
  emptyLabel: string;
}) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  if (buckets.every((bucket) => bucket.count === 0)) {
    return (
      <p className="py-6 text-center text-[12px] text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${buckets.length * 36} 88`}
      className="h-[88px] w-full"
      role="img"
      aria-label="Turn volume by day"
    >
      {buckets.map((bucket, index) => {
        const height = Math.max(4, (bucket.count / max) * 64);
        const x = index * 36 + 8;
        const y = 72 - height;
        return (
          <g key={bucket.day}>
            <rect
              x={x}
              y={y}
              width={20}
              height={height}
              rx={4}
              className="fill-[#3182f6]/80"
            />
            <text
              x={x + 10}
              y={84}
              textAnchor="middle"
              className="fill-[#8b95a1] text-[8px]"
            >
              {bucket.day.slice(8)}
            </text>
            {bucket.count > 0 ? (
              <text
                x={x + 10}
                y={y - 2}
                textAnchor="middle"
                className="fill-[#4e5968] text-[8px] font-semibold"
              >
                {bucket.count}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function HorizontalBars({
  rows,
  tone = "default",
}: {
  rows: readonly SelfLearningBarRow[];
  tone?: "default" | "warn";
}) {
  if (rows.length === 0) {
    return <p className="text-[12px] text-muted-foreground">데이터 없음</p>;
  }

  const max = Math.max(...rows.map((row) => row.count), 1);
  const fill = tone === "warn" ? "bg-[#ff9500]/70" : "bg-[#34c759]/70";

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex justify-between gap-2 text-[11px]">
            <span className="truncate text-[#4e5968]">{row.label}</span>
            <span className="shrink-0 tabular-nums font-medium text-[#191f28]">
              {row.count}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#f2f4f6]">
            <div
              className={cn("h-full rounded-full transition-all", fill)}
              style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/** Self-learning mini charts — live turns + hit/run feedback (dev-only API). */
export function SelfLearningSummaryPanel() {
  const { loading, summary, refresh } = useSelfLearningSummary(30_000);

  return (
    <div className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Self-learning
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            live turn · intent · failure · feedback
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-xl border px-3 py-1.5 text-sm"
        >
          새로고침
        </button>
      </div>

      {loading && !summary ? (
        <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />
      ) : !summary ? (
        <p className="text-sm text-muted-foreground">
          요약 없음 — 채팅 후 live turn이 쌓이면 차트가 채워집니다
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiTile label="Output turns" value={summary.outputTurnCount} />
            <KpiTile
              label="Failure rate"
              value={
                summary.failureRatePct != null ? `${summary.failureRatePct}%` : "—"
              }
              sub={`${summary.failureCount}건`}
            />
            <KpiTile
              label="Feedback"
              value={`↑${summary.feedbackUp} ↓${summary.feedbackDown}`}
            />
            <KpiTile
              label="Avg latency"
              value={
                summary.avgLatencyMs != null ? `${summary.avgLatencyMs}ms` : "—"
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/50 p-4">
              <p className="mb-2 text-[12px] font-semibold text-[#191f28]">
                Turn volume (7일)
              </p>
              <MiniBarChart
                buckets={summary.turnsByDay}
                emptyLabel="최근 7일 turn 없음"
              />
            </div>
            <div className="rounded-2xl border border-border/50 p-4">
              <p className="mb-2 text-[12px] font-semibold text-[#191f28]">
                Intent TOP
              </p>
              <HorizontalBars rows={summary.intentBars} />
            </div>
          </div>

          {summary.failureKindBars.length > 0 ? (
            <div className="rounded-2xl border border-border/50 p-4">
              <p className="mb-2 text-[12px] font-semibold text-[#191f28]">
                Failure kinds
              </p>
              <HorizontalBars rows={summary.failureKindBars} tone="warn" />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
