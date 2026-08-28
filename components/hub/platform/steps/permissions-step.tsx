"use client";

import { PermissionsStep } from "@/components/hub/capability/steps/permissions-step";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function PlatformPermissionsStep({ wizard }: { wizard: HubPlatformWizard }) {
  const capabilityWizard = wizard as unknown as HubCapabilityWizard;
  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <WizardStepHeader
          step={9}
          title="Permissions"
          description="Declare required host permissions and risk levels."
        />
      </div>
      <PermissionsStep wizard={capabilityWizard} />
    </div>
  );
}
