"use client";

import { ManifestStep } from "@/components/hub/capability/steps/manifest-step";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

/** Reuses capability manifest editor for platform capabilities step. */
export function CapabilitiesStep({ wizard }: { wizard: HubPlatformWizard }) {
  const capabilityWizard = wizard as unknown as HubCapabilityWizard;
  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <WizardStepHeader
          step={7}
          title="Capabilities"
          description="Actions, schemas, and approval gates."
        />
      </div>
      <ManifestStep wizard={capabilityWizard} />
    </div>
  );
}
