"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { HubStandardRuleCard } from "@/components/hub/standards/hub-standard-rule-card";
import { HubStandardsChecklist } from "@/components/hub/standards/hub-standards-checklist";
import {
  contextualChecklist,
  contextualGuideStandard,
  hubStandardsHref,
  PRODUCER_REUSE_FLOW,
  REVIEWER_SCORE_DIMENSIONS,
  type ContextualGuideMode,
  type ReviewDecision,
} from "@/lib/hub/standards";
import { cn } from "@/lib/utils";

type HubContextualGuideProps = {
  readonly mode: ContextualGuideMode;
  readonly capabilityId?: string;
  readonly collapsible?: boolean;
  readonly defaultExpanded?: boolean;
  readonly showScores?: boolean;
  readonly onDecision?: (decision: ReviewDecision) => void;
  readonly className?: string;
};

export function HubContextualGuide({
  mode,
  capabilityId,
  collapsible = true,
  defaultExpanded = true,
  showScores = mode === "reviewer",
  onDecision,
  className,
}: HubContextualGuideProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const standard = contextualGuideStandard(mode);
  const checklist = contextualChecklist(mode);
  const storageKey = `contextual-guide-${mode}${capabilityId ? `-${capabilityId}` : ""}`;

  const title = mode === "producer" ? "Producer Standard" : "Reviewer Standard";
  const standardsHref = hubStandardsHref(
    mode === "producer" ? "producer_guide" : "reviewer_guide",
  );

  return (
    <aside
      className={cn(
        "rounded-xl border border-[#E2E8F0] bg-white",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-2 border-b border-[#E2E8F0] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">
            {title}
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-[#0f172a]">{standard.titleKo}</p>
          {capabilityId ? (
            <p className="mt-0.5 truncate font-mono text-[10px] text-[#94a3b8]">{capabilityId}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={standardsHref}
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f8fafc] hover:text-violet-600"
            title="전체 표준 열기"
          >
            <ExternalLink className="size-3.5" />
          </Link>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f8fafc]"
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          ) : null}
        </div>
      </header>

      {expanded ? (
        <div className="max-h-[420px] overflow-y-auto p-4 rimvio-scroll-touch">
          <p className="text-[11px] leading-relaxed text-[#64748b]">{standard.summaryKo}</p>

          {mode === "producer" ? (
            <ReuseFlowMini className="mt-3" />
          ) : null}

          {standard.sections
            .flatMap((s) => s.rules ?? [])
            .slice(0, mode === "producer" ? 1 : 0)
            .map((rule) => (
              <div key={rule.id} className="mt-3">
                <HubStandardRuleCard rule={rule} compact />
              </div>
            ))}

          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase text-[#64748b]">
              {mode === "producer" ? "Producer Checklist" : "Evaluation Checklist"}
            </p>
            <HubStandardsChecklist storageKey={storageKey} items={checklist ?? []} compact />
          </div>

          {showScores ? (
            <ReviewerScoreInput capabilityId={capabilityId} onDecision={onDecision} />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function ReuseFlowMini({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg bg-violet-50/80 px-3 py-2", className)}>
      <p className="text-[10px] font-semibold uppercase text-violet-700">Reuse Before Create</p>
      <ol className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-violet-800">
        {PRODUCER_REUSE_FLOW.map((step, i) => (
          <li key={step.id} className="flex items-center gap-1">
            {i > 0 ? <span className="text-violet-400">→</span> : null}
            <span className="rounded bg-white/80 px-1.5 py-0.5">{step.labelKo}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReviewerScoreInput({
  capabilityId,
  onDecision,
}: {
  capabilityId?: string;
  onDecision?: (decision: ReviewDecision) => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const storageKey = `reviewer-scores${capabilityId ? `-${capabilityId}` : ""}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setScores(JSON.parse(raw) as Record<string, number>);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Record<string, number>) => {
      setScores(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  return (
    <div className="mt-4 border-t border-[#E2E8F0] pt-4">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Score (1–5)</p>
      <div className="mt-2 space-y-2">
        {REVIEWER_SCORE_DIMENSIONS.map((dim) => (
          <label key={dim.id} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-[#475569]">{dim.labelKo}</span>
            <input
              type="number"
              min={dim.min}
              max={dim.max}
              value={scores[dim.id] ?? ""}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) persist({ ...scores, [dim.id]: v });
              }}
              className="w-14 rounded border border-[#E2E8F0] px-2 py-1 text-center text-[11px]"
            />
          </label>
        ))}
      </div>

      {onDecision ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["PASS", "NEEDS_IMPROVEMENT", "FAIL"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDecision(d)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[10px] font-semibold",
                d === "PASS"
                  ? "bg-emerald-50 text-emerald-700"
                  : d === "FAIL"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
