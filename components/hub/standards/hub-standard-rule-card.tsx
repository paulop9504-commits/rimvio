"use client";

import { cn } from "@/lib/utils";
import type { StandardExample, StandardRule } from "@/lib/hub/standards";

type HubStandardRuleCardProps = {
  readonly rule: StandardRule;
  readonly compact?: boolean;
};

export function HubStandardRuleCard({ rule, compact }: HubStandardRuleCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border border-[#E2E8F0] bg-white",
        compact ? "p-3" : "p-4",
      )}
    >
      <h4 className="text-[13px] font-semibold text-[#0f172a]">{rule.titleKo}</h4>

      <div className="mt-2 rounded-lg bg-[#f8fafc] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">Why</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#475569]">{rule.whyKo}</p>
      </div>

      {rule.examples?.map((ex) => (
        <ExampleBlock key={ex.kind} example={ex} />
      ))}

      {rule.checklist && rule.checklist.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {rule.checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-[11px] text-[#64748b]">
              <span className="text-[#94a3b8]" aria-hidden>
                ☑
              </span>
              {item.labelKo}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ExampleBlock({ example }: { example: StandardExample }) {
  const isGood = example.kind === "good";
  return (
    <div className="mt-3">
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          isGood ? "text-emerald-600" : "text-amber-600",
        )}
      >
        {isGood ? "Good" : "Bad"}
      </p>
      <ul className="mt-1 space-y-0.5">
        {example.items.map((item) => (
          <li
            key={item}
            className={cn(
              "font-mono text-[11px]",
              isGood ? "text-emerald-700" : "text-amber-700 line-through decoration-amber-400/60",
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
