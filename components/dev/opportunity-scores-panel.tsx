"use client";

import { useMemo, useState } from "react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  listEvaluatedEventOpportunities,
  listRankedEventOpportunities,
} from "@/lib/opportunity-engine/rank-event-opportunities";
import type { EventOpportunityPriority } from "@/lib/opportunity-engine/types";
import { cn } from "@/lib/utils";

function priorityTone(priority: EventOpportunityPriority): string {
  if (priority === "HIGH") {
    return "bg-[#34c759]/12 text-[#248a3d]";
  }
  if (priority === "MEDIUM") {
    return "bg-[#ff9500]/12 text-[#c93400]";
  }
  return "bg-muted text-muted-foreground";
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** opportunity-engine ranked signals — Dev Intelligence tier only. */
export function OpportunityScoresPanel() {
  const [version, setVersion] = useState(0);

  const ranked = useMemo(() => {
    void version;
    return listRankedEventOpportunities({ maxResults: 12 });
  }, [version]);

  const evaluated = useMemo(() => {
    void version;
    return listEvaluatedEventOpportunities({ maxResults: 12 });
  }, [version]);

  const highCount = ranked.filter((row) => row.priority === "HIGH").length;
  const mediumCount = ranked.filter((row) => row.priority === "MEDIUM").length;

  return (
    <div className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Opportunity Engine
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            EventCandidate composite score · HIGH / MEDIUM / LOW
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

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">HIGH 기회</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{highCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            scored {evaluated.length} events
          </p>
        </div>
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">MEDIUM</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{mediumCount}</p>
        </div>
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">Top composite</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {ranked[0] ? formatPct(ranked[0].score) : "—"}
          </p>
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 scorable EventCandidate 없음 — 채팅·캡처 후 다시 확인
        </p>
      ) : (
        <ul className="space-y-2">
          {ranked.slice(0, 8).map((signal) => {
            const event = findLifeEventCandidate(signal.ecId);
            const breakdown = evaluated.find((row) => row.ecId === signal.ecId);
            return (
              <li
                key={signal.ecId}
                className="rounded-2xl border border-border/50 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {event?.title ?? signal.ecId}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        priorityTone(signal.priority),
                      )}
                    >
                      {signal.priority}
                    </span>
                    <span className="tabular-nums font-semibold">
                      {formatPct(signal.score)}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{signal.reason}</p>
                {breakdown ? (
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    time {formatPct(breakdown.timeUrgency)} · lifecycle{" "}
                    {formatPct(breakdown.lifecycleUrgency)} · context{" "}
                    {formatPct(breakdown.contextRelevance)} · action{" "}
                    {formatPct(breakdown.actionability)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
