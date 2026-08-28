"use client";

import { HubDeployWorkspace } from "@/components/hub/deploy/hub-deploy-workspace";
import { useHubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function HubPlatformWizardClient() {
  const wizard = useHubPlatformWizard();

  if (!wizard.hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0c0e12] text-[#6b7684]">
        Draft 불러오는 중…
      </div>
    );
  }

  return <HubDeployWorkspace mode="platform" wizard={wizard} />;
}
