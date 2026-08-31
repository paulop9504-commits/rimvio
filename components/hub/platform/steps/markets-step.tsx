"use client";

import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { MarketDeploymentPanel } from "@/components/hub/wizard/market-deployment-panel";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function MarketsStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;

  return (
    <div className="mx-auto max-w-4xl">
      <WizardStepHeader
        step={10}
        title="Markets"
        description="Country deployments and per-market readiness."
      />
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <MarketDeploymentPanel draft={draft} onChange={updateDraft} />
      </div>
    </div>
  );
}
