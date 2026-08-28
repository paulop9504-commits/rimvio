"use client";

import { TestStep } from "@/components/hub/capability/steps/test-step";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function PlatformTestingStep({ wizard }: { wizard: HubPlatformWizard }) {
  const capabilityWizard = wizard as unknown as HubCapabilityWizard;
  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <WizardStepHeader
          step={13}
          title="Testing"
          description="Sandbox validation before publish."
        />
      </div>
      <TestStep wizard={capabilityWizard} />
    </div>
  );
}
