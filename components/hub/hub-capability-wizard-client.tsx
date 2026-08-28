"use client";

import { HubDeployWorkspace } from "@/components/hub/deploy/hub-deploy-workspace";
import { useHubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";

export function HubCapabilityWizardClient() {
  const wizard = useHubCapabilityWizard();

  if (!wizard.hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0c0e12] text-[#6b7684]">
        Draft 불러오는 중…
      </div>
    );
  }

  return <HubDeployWorkspace mode="capability" wizard={wizard} />;
}
