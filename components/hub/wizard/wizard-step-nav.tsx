"use client";

import { Check } from "lucide-react";
import type { StepValidationState, WizardStepId } from "@/lib/hub/capability/types";
import { cn } from "@/lib/utils";

const STEPS: { id: WizardStepId; label: string }[] = [
  { id: 1, label: "Package Information" },
  { id: 2, label: "Manifest" },
  { id: 3, label: "Permissions" },
  { id: 4, label: "Context & I/O" },
  { id: 5, label: "Test & Validate" },
  { id: 6, label: "Review & Publish" },
];

export function WizardStepNav({
  currentStep,
  stepValidation,
  onStepClick,
  variant = "sidebar",
}: {
  currentStep: WizardStepId;
  stepValidation: StepValidationState;
  onStepClick: (step: WizardStepId) => void;
  variant?: "sidebar" | "mobile";
}) {
  const stepDone = (id: WizardStepId): boolean => {
    const map: Record<WizardStepId, boolean> = {
      1: stepValidation.package,
      2: stepValidation.manifest,
      3: stepValidation.permissions,
      4: stepValidation.context,
      5: stepValidation.test,
      6: false,
    };
    return id < currentStep || map[id];
  };

  const stepFailed = (id: WizardStepId): boolean => {
    if (id >= currentStep) return false;
    const map: Record<WizardStepId, boolean> = {
      1: !stepValidation.package,
      2: !stepValidation.manifest,
      3: !stepValidation.permissions,
      4: !stepValidation.context,
      5: !stepValidation.test,
      6: false,
    };
    return map[id];
  };

  if (variant === "mobile") {
    return (
      <div className="flex gap-1 overflow-x-auto border-b border-[#E2E8F0] bg-white px-2 py-2 lg:hidden">
        {STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(step.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold",
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
        {STEPS.map((step) => {
          const active = step.id === currentStep;
          const done = stepDone(step.id);
          const failed = stepFailed(step.id);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors",
                active && "bg-[#EEF2FF] font-semibold text-[#6366F1]",
                !active && done && "text-[#0F172A]",
                !active && !done && "text-[#94A3B8]",
                failed && "text-red-600",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  active && "bg-[#6366F1] text-white",
                  done && !active && "bg-emerald-100 text-emerald-700",
                  failed && "bg-red-100 text-red-600",
                  !active && !done && !failed && "bg-[#E2E8F0] text-[#64748B]",
                )}
              >
                {done && !active ? <Check className="size-3" /> : step.id}
              </span>
              <span className="min-w-0 leading-snug">{step.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
