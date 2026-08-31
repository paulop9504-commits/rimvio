"use client";

import { Check } from "lucide-react";
import type { PlatformStepValidationState, PlatformWizardStepId } from "@/lib/hub/platform/types";
import { PLATFORM_WIZARD_STEP_LABELS } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

export function PlatformWizardStepNav({
  currentStep,
  stepValidation,
  onStepClick,
  variant = "sidebar",
}: {
  currentStep: PlatformWizardStepId;
  stepValidation: PlatformStepValidationState;
  onStepClick: (step: PlatformWizardStepId) => void;
  variant?: "sidebar" | "mobile";
}) {
  const stepDone = (id: PlatformWizardStepId): boolean => {
    const meta = PLATFORM_WIZARD_STEP_LABELS.find((s) => s.id === id);
    if (!meta || id === 14) return false;
    return id < currentStep || stepValidation[meta.key];
  };

  const stepFailed = (id: PlatformWizardStepId): boolean => {
    const meta = PLATFORM_WIZARD_STEP_LABELS.find((s) => s.id === id);
    if (!meta || id >= currentStep || id === 14) return false;
    return !stepValidation[meta.key];
  };

  if (variant === "mobile") {
    return (
      <div className="flex gap-1 overflow-x-auto border-b border-[#E2E8F0] bg-white px-2 py-2 lg:hidden">
        {PLATFORM_WIZARD_STEP_LABELS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(step.id)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
              step.id === currentStep
                ? "bg-[#6366F1] text-white"
                : "bg-[#F8FAFC] text-[#64748B] ring-1 ring-[#E2E8F0]",
            )}
          >
            {step.id}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="hidden w-[200px] shrink-0 flex-col border-r border-[#E2E8F0] bg-[#FAFBFC] py-4 lg:flex">
      <div className="space-y-0.5 px-2">
        {PLATFORM_WIZARD_STEP_LABELS.map((step) => {
          const active = step.id === currentStep;
          const done = stepDone(step.id);
          const failed = stepFailed(step.id);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors",
                active && "bg-[#EEF2FF] font-semibold text-[#6366F1]",
                !active && done && "text-[#0F172A]",
                !active && !done && "text-[#94A3B8]",
                failed && "text-red-600",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                  active && "bg-[#6366F1] text-white",
                  done && !active && "bg-emerald-100 text-emerald-700",
                  failed && "bg-red-100 text-red-600",
                  !active && !done && !failed && "bg-[#E2E8F0] text-[#64748B]",
                )}
              >
                {done && !active ? <Check className="size-2.5" /> : step.id}
              </span>
              <span className="min-w-0 leading-snug">{step.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
