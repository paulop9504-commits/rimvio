"use client";

import Link from "next/link";
import {
  buildPersonalAskContinuityActions,
  type GlobeAskContinuityActionId,
} from "@/lib/globe/globe-ask-continuity";
import type { PersonalContextAskRecallContext } from "@/lib/personal-context-ask";
import { cn } from "@/lib/utils";

export type PersonalContextAskContinuityProps = {
  recall: PersonalContextAskRecallContext | null | undefined;
  featuredEventId: string | null;
  continueLabel: string;
  labels: Record<GlobeAskContinuityActionId, string>;
  onNavigate?: () => void;
  className?: string;
};

export function PersonalContextAskContinuity({
  recall,
  featuredEventId,
  continueLabel,
  labels,
  onNavigate,
  className,
}: PersonalContextAskContinuityProps) {
  const actions = buildPersonalAskContinuityActions({
    recall: recall ?? null,
    featuredEventId,
  });

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2 border-t border-black/[0.05] pt-3", className)}>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8b95a1]">
        {continueLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            onClick={() => onNavigate?.()}
            className="rounded-full bg-[#f0f4ff] px-3.5 py-1.5 text-[12px] font-semibold text-[#3182f6] ring-1 ring-[#3182f6]/12 active:scale-[0.98]"
          >
            {labels[action.id]}
          </Link>
        ))}
      </div>
    </div>
  );
}
