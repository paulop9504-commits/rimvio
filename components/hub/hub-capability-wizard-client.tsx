"use client";

import { HubHeader } from "@/components/hub/layout/hub-header";
import { PackageStep } from "@/components/hub/capability/steps/package-step";
import { ManifestStep } from "@/components/hub/capability/steps/manifest-step";
import { PermissionsStep } from "@/components/hub/capability/steps/permissions-step";
import { ContextStep } from "@/components/hub/capability/steps/context-step";
import { TestStep } from "@/components/hub/capability/steps/test-step";
import { ReviewStep } from "@/components/hub/capability/steps/review-step";
import {
  AutosaveStatusBar,
  WizardFooter,
} from "@/components/hub/wizard/wizard-footer";
import { WizardStepNav } from "@/components/hub/wizard/wizard-step-nav";
import { useHubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { validatePackageStep } from "@/lib/hub/capability/validation";

export function HubCapabilityWizardClient() {
  const wizard = useHubCapabilityWizard();

  if (!wizard.hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8FAFC] text-[#64748B]">
        Loading draft…
      </div>
    );
  }

  const { currentStep, goNext, goBack, saveDraftNow, publishCapability, publishReady, publishStatus } =
    wizard;

  const canGoNext =
    currentStep === 1
      ? validatePackageStep(wizard.draft).valid
      : currentStep === 2
        ? wizard.stepValidation.manifest
        : currentStep === 3
          ? wizard.stepValidation.permissions
          : currentStep === 4
            ? wizard.stepValidation.context
            : currentStep === 5
              ? wizard.stepValidation.test
              : true;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FAFC]">
      <HubHeader />
      <div className="flex min-h-0 flex-1">
        <WizardStepNav
          currentStep={currentStep}
          stepValidation={wizard.stepValidation}
          onStepClick={wizard.goToStep}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="border-b border-[#E2E8F0] bg-white px-4 py-3 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-[16px] font-semibold text-[#0F172A]">Submit New Capability</h1>
              <AutosaveStatusBar
                status={wizard.autosaveStatus}
                lastSavedAt={wizard.lastSavedAt}
                onRetry={saveDraftNow}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
            {currentStep === 1 ? <PackageStep wizard={wizard} /> : null}
            {currentStep === 2 ? <ManifestStep wizard={wizard} /> : null}
            {currentStep === 3 ? <PermissionsStep wizard={wizard} /> : null}
            {currentStep === 4 ? <ContextStep wizard={wizard} /> : null}
            {currentStep === 5 ? <TestStep wizard={wizard} /> : null}
            {currentStep === 6 ? <ReviewStep wizard={wizard} /> : null}
          </div>

          {publishStatus === "idle" || publishStatus === "submitting" ? (
            <WizardFooter
              currentStep={currentStep}
              onBack={goBack}
              onSaveDraft={saveDraftNow}
              onNext={goNext}
              onPublish={() => void publishCapability()}
              nextDisabled={!canGoNext}
              publishDisabled={!publishReady}
              publishLoading={publishStatus === "submitting"}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
