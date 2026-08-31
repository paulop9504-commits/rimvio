"use client";

import { cn } from "@/lib/utils";

export function WizardStepHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          "bg-[#6366F1] text-[15px] font-bold text-white shadow-sm",
        )}
      >
        {step}
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0F172A]">
          {title}
        </h2>
        <p className="mt-0.5 text-[13px] text-[#64748B]">{description}</p>
      </div>
    </div>
  );
}
