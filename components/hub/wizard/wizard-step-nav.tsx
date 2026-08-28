"use client";

import Link from "next/link";
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
}: {
  currentStep: WizardStepId;
  stepValidation: StepValidationState;
  onStepClick: (step: WizardStepId) => void;
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

  return (
    <>
      <div className="hidden w-[240px] shrink-0 flex-col border-r border-[#E2E8F0] bg-[#F8FAFC] lg:flex">
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            Submit Capability
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
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
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors",
                  active && "bg-[#EEF2FF] font-semibold text-[#6366F1]",
                  !active && done && "text-[#0F172A]",
                  !active && !done && "text-[#94A3B8]",
                  failed && "text-red-600",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    active && "bg-[#6366F1] text-white",
                    done && !active && "bg-emerald-100 text-emerald-700",
                    failed && "bg-red-100 text-red-600",
                    !active && !done && !failed && "bg-[#E2E8F0] text-[#64748B]",
                  )}
                >
                  {done && !active ? <Check className="size-3.5" /> : step.id}
                </span>
                <span className="min-w-0 leading-snug">{step.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="m-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
          <p className="text-[12px] font-semibold text-[#0F172A]">Need Help?</p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Read the Submission Guide and Capability Contract docs.
          </p>
          <Link
            href="/hub"
            className="mt-2 inline-block text-[11px] font-semibold text-[#6366F1]"
          >
            Documentation →
          </Link>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[#E2E8F0] bg-[#F8FAFC] px-2 py-2 lg:hidden">
        {STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(step.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold",
              step.id === currentStep
                ? "bg-[#6366F1] text-white"
                : "bg-white text-[#64748B] ring-1 ring-[#E2E8F0]",
            )}
          >
            {step.id}. {step.label.split(" ")[0]}
          </button>
        ))}
      </div>
    </>
  );
}
