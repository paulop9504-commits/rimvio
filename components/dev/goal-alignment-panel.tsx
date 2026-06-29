"use client";

import { useMemo, useState } from "react";
import { listClientGoalSnapshots } from "@/lib/dev/list-client-goal-snapshots";
import type { GoalFocusKind } from "@/lib/goal-engine/types";
import { cn } from "@/lib/utils";

function focusTone(kind: GoalFocusKind): string {
  if (kind === "none") {
    return "bg-muted text-muted-foreground";
  }
  return "bg-[#3182f6]/10 text-[#3182f6]";
}

function formatScore(value: number | undefined): string {
  if (value == null) {
    return "—";
  }
  return `${Math.round(value)}%`;
}

/** goal-engine turn snapshot — sessionStorage read model for Dev Intelligence. */
export function GoalAlignmentPanel() {
  const [version, setVersion] = useState(0);

  const snapshots = useMemo(() => {
    void version;
    return listClientGoalSnapshots();
  }, [version]);

  const latest = snapshots[0] ?? null;

  return (
    <div className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Goal Engine
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            마지막 턴 GoalSnapshot · primaryFocus · productivityScore
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVersion((current) => current + 1)}
          className="rounded-xl border px-3 py-1.5 text-sm"
        >
          새로고침
        </button>
      </div>

      {!latest ? (
        <p className="text-sm text-muted-foreground">
          GoalSnapshot 없음 — 채팅 한 턴 실행 후 sessionStorage에 캐시됩니다
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm font-medium">정렬 점수</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatScore(latest.snapshot.productivityScore)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                scope {latest.scopeId}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm font-medium">primaryFocus</p>
              <p className="mt-2">
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-1 text-sm font-semibold",
                    focusTone(latest.snapshot.primaryFocus),
                  )}
                >
                  {latest.snapshot.primaryFocus}
                </span>
              </p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm font-medium">activeGoals</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {latest.snapshot.activeGoals.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                rev {latest.snapshot.sourceRevision.slice(0, 12)}
              </p>
            </div>
          </div>

          {latest.snapshot.weekFocusLabel ? (
            <p className="text-sm text-muted-foreground">
              week focus · {latest.snapshot.weekFocusLabel}
            </p>
          ) : null}

          {latest.snapshot.eventHorizonSummary ? (
            <div className="rounded-2xl border border-border/50 px-4 py-3 text-sm">
              <p className="font-medium">
                horizon · {latest.snapshot.eventHorizonSummary.severity}
              </p>
              <p className="mt-1 text-muted-foreground">
                {latest.snapshot.eventHorizonSummary.summary}
              </p>
            </div>
          ) : null}

          {latest.snapshot.activeGoals.length > 0 ? (
            <ul className="space-y-2">
              {latest.snapshot.activeGoals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{goal.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {goal.kind}
                    {goal.progress != null ? ` · ${goal.progress}%` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {snapshots.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              +{snapshots.length - 1}개 scope snapshot 캐시됨
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
