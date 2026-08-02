"use client";

import type { ObjectScopedPromptResult } from "@/lib/callout/scoped-prompt/types";
import { OBJECT_SCOPED_PROMPT_STAGES } from "@/lib/callout/scoped-prompt/types";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = {
  object_context: "Object",
  user_intent: "Intent",
  context_ai: "Context AI",
  simulation: "Simulation",
  prepare: "Prepare",
};

export function CalloutScopedPromptStatus({
  result,
  className,
}: {
  result: ObjectScopedPromptResult | null;
  className?: string;
}) {
  if (!result) return null;

  const done = new Set(result.stagesCompleted);

  return (
    <div
      className={cn(
        "space-y-2 rounded-[14px] bg-[#f9fafb] px-3 py-2.5",
        className,
      )}
      data-object-scoped-prompt
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-[0.04em] text-[#8b95a1]">
          Object Scope · {result.scope.title}
        </p>
        <span className="rounded-full bg-[#e8f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#3182f6]">
          {result.intent.labelKo}
        </span>
      </div>
      <ol className="flex flex-wrap items-center gap-1">
        {OBJECT_SCOPED_PROMPT_STAGES.map((stage, i) => (
          <li key={stage} className="flex items-center gap-1">
            {i > 0 ? (
              <span className="text-[9px] text-[#d1d6db]" aria-hidden>
                →
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                done.has(stage)
                  ? "bg-[#191f28] text-white"
                  : "bg-white text-[#c4c9d0] ring-1 ring-black/[0.04]",
              )}
            >
              {STAGE_LABEL[stage] ?? stage}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] leading-snug text-[#4e5968]">{result.replyKo}</p>
    </div>
  );
}
