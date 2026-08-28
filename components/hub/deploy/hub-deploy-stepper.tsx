"use client";

import { cn } from "@/lib/utils";
import { DEPLOY_UI_STEPS, type DeployUiStepId } from "@/lib/hub/deploy/deploy-steps";

type HubDeployStepperProps = {
  activeStep: DeployUiStepId;
  completedThrough: DeployUiStepId;
  onStepClick: (step: DeployUiStepId) => void;
};

export function HubDeployStepper({
  activeStep,
  completedThrough,
  onStepClick,
}: HubDeployStepperProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] bg-[#111318] px-4 py-2.5 rimvio-scroll-touch">
      {DEPLOY_UI_STEPS.map((step, index) => {
        const done = step.id < activeStep || step.id <= completedThrough;
        const active = step.id === activeStep;
        return (
          <div key={step.id} className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "bg-[#4593fc]/20 text-[#8ec0ff]"
                  : done
                    ? "text-[#b0b8c1] hover:bg-white/[0.04]"
                    : "text-[#6b7684] hover:bg-white/[0.04] hover:text-[#b0b8c1]",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  active
                    ? "bg-[#4593fc] text-white"
                    : done
                  ? "bg-[#4593fc]/30 text-[#8ec0ff]"
                  : "bg-white/[0.08] text-[#6b7684]",
                )}
              >
                {step.id}
              </span>
              <span className="hidden sm:inline">{step.labelKo}</span>
              <span className="sm:hidden">{step.labelEn}</span>
            </button>
            {index < DEPLOY_UI_STEPS.length - 1 ? (
              <div
                className={cn(
                  "mx-1 h-px w-4 shrink-0",
                  done ? "bg-[#4593fc]/40" : "bg-white/[0.08]",
                )}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
