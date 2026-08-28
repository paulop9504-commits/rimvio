"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HubSidebar } from "@/components/hub/layout/hub-sidebar";
import { HubDeployAgentChat } from "@/components/hub/deploy/hub-deploy-agent-chat";
import { HubDeployEditor } from "@/components/hub/deploy/hub-deploy-editor";
import { HubDeployHeader } from "@/components/hub/deploy/hub-deploy-header";
import { HubDeployInspector } from "@/components/hub/deploy/hub-deploy-inspector";
import { HubDeployStepper } from "@/components/hub/deploy/hub-deploy-stepper";
import { HubDeployTemplates } from "@/components/hub/deploy/hub-deploy-templates";
import { PackageStep } from "@/components/hub/capability/steps/package-step";
import { ManifestStep } from "@/components/hub/capability/steps/manifest-step";
import { PermissionsStep } from "@/components/hub/capability/steps/permissions-step";
import { ContextStep } from "@/components/hub/capability/steps/context-step";
import { TestStep } from "@/components/hub/capability/steps/test-step";
import { ReviewStep } from "@/components/hub/capability/steps/review-step";
import { ArchitectureStep } from "@/components/hub/platform/steps/architecture-step";
import { CapabilitiesStep } from "@/components/hub/platform/steps/capabilities-step";
import { CommerceStep } from "@/components/hub/platform/steps/commerce-step";
import { DataStep } from "@/components/hub/platform/steps/data-step";
import { IdentityStep } from "@/components/hub/platform/steps/identity-step";
import { MarketsStep } from "@/components/hub/platform/steps/markets-step";
import { OrganizationStep } from "@/components/hub/platform/steps/organization-step";
import { PlatformPermissionsStep } from "@/components/hub/platform/steps/permissions-step";
import { ProductStep } from "@/components/hub/platform/steps/product-step";
import { PlatformReviewStep } from "@/components/hub/platform/steps/review-step";
import { SecurityStep } from "@/components/hub/platform/steps/security-step";
import { PlatformTestingStep } from "@/components/hub/platform/steps/testing-step";
import { UiStep } from "@/components/hub/platform/steps/ui-step";
import { WorkflowStep } from "@/components/hub/platform/steps/workflow-step";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";
import {
  CAPABILITY_UI_TO_INTERNAL,
  capabilityInternalToUiStep,
  PLATFORM_UI_TO_INTERNAL,
  platformInternalToUiStep,
  type DeployUiStepId,
} from "@/lib/hub/deploy/deploy-steps";
import { exportPlatformManifestJson } from "@/lib/hub/capability/manifest-bridge";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import { cn } from "@/lib/utils";

type HubDeployWorkspaceProps =
  | {
      mode: "capability";
      wizard: HubCapabilityWizard;
    }
  | {
      mode: "platform";
      wizard: HubPlatformWizard;
    };

function capabilityStepChecks(
  wizard: HubCapabilityWizard,
): Record<DeployUiStepId, boolean> {
  const v = wizard.stepValidation;
  return {
    1: v.package,
    2: v.manifest,
    3: v.context,
    4: v.permissions,
    5: v.test,
    6: wizard.publishStatus === "pending-review",
  };
}

function platformStepChecks(
  wizard: HubPlatformWizard,
): Record<DeployUiStepId, boolean> {
  const v = wizard.stepValidation;
  return {
    1: v.identity && v.organization && v.product,
    2: v.architecture && v.data && v.ui,
    3: v.capabilities && v.workflow,
    4: v.permissions && v.markets && v.commerce && v.security,
    5: v.testing,
    6: wizard.publishStatus === "pending-review" || v.testing,
  };
}

export function HubDeployWorkspace(props: HubDeployWorkspaceProps) {
  const { mode, wizard } = props;
  const [agentSeed, setAgentSeed] = useState<string | null>(null);

  const activeUiStep =
    mode === "capability"
      ? capabilityInternalToUiStep(wizard.currentStep)
      : platformInternalToUiStep(wizard.currentStep);

  const stepChecks =
    mode === "capability"
      ? capabilityStepChecks(wizard)
      : platformStepChecks(wizard);

  const completedThrough = useMemo(() => {
    let max = 1 as DeployUiStepId;
    (Object.entries(stepChecks) as [string, boolean][]).forEach(([id, ok]) => {
      if (ok) max = Math.max(max, Number(id)) as DeployUiStepId;
    });
    return max;
  }, [stepChecks]);

  const manifestJson = useMemo(
    () => exportPlatformManifestJson(wizard.draft),
    [wizard.draft],
  );

  const handleUiStepClick = useCallback(
    (uiStep: DeployUiStepId) => {
      if (mode === "capability") {
        wizard.goToStep(CAPABILITY_UI_TO_INTERNAL[uiStep]);
      } else {
        wizard.goToStep(PLATFORM_UI_TO_INTERNAL[uiStep]);
      }
    },
    [mode, wizard],
  );

  const handleManifestChange = useCallback(
    (raw: string) => {
      wizard.importManifest(raw);
    },
    [wizard],
  );

  const handlePublish = useCallback(() => {
    if (mode === "capability") {
      void wizard.publishCapability();
    } else {
      void wizard.publishPlatform();
    }
  }, [mode, wizard]);

  const deployExecutor = useMemo<DeployExecutorCallbacks>(
    () => ({
      mode,
      getDraft: () => wizard.draft,
      updateDraft: (patch) => wizard.updateDraft(patch),
      runSandboxTest: () => wizard.runSandboxTest(),
      onPublishSuccess: (platformId) => {
        wizard.completeAgentPublish(platformId);
        wizard.saveDraftNow();
      },
      onGoToStep: (step) => {
        if (mode === "capability") {
          wizard.goToStep(step as HubCapabilityWizard["currentStep"]);
        } else {
          wizard.goToStep(step as HubPlatformWizard["currentStep"]);
        }
      },
    }),
    [mode, wizard],
  );

  const stepPanel =
    mode === "capability" ? (
      <CapabilityStepPanel wizard={wizard} />
    ) : (
      <PlatformStepPanel wizard={wizard} />
    );

  const showStepPanel =
    mode === "capability"
      ? wizard.currentStep <= 4
      : wizard.currentStep <= 12;

  const title =
    mode === "capability" ? "새로운 Capability 만들기" : "새로운 Platform 만들기";
  const subtitle = "Rimvio Hub Beta · 배포 개발 워크스페이스";

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0c0e12] text-[#f2f4f6]">
      <HubSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <HubDeployHeader
          title={title}
          subtitle={subtitle}
          autosaveStatus={wizard.autosaveStatus}
          lastSavedAt={wizard.lastSavedAt}
          onRetryAutosave={wizard.saveDraftNow}
        />

        <HubDeployStepper
          activeStep={activeUiStep}
          completedThrough={completedThrough}
          onStepClick={handleUiStepClick}
        />

        <div className="flex min-h-0 flex-1">
          <div className="hidden w-[300px] shrink-0 lg:flex xl:w-[320px]">
            <HubDeployAgentChat
              mode={mode}
              draft={wizard.draft}
              testsPassed={wizard.testsPassed}
              executor={deployExecutor}
              onApplyPatch={(patch) => wizard.updateDraft(patch)}
              seedUtterance={agentSeed}
              onSeedConsumed={() => setAgentSeed(null)}
              onSuggestedStep={(step) => {
                if (mode === "capability") {
                  wizard.goToStep(step as HubCapabilityWizard["currentStep"]);
                } else {
                  wizard.goToStep(step as HubPlatformWizard["currentStep"]);
                }
              }}
            />
          </div>

          <HubDeployEditor
            manifestJson={manifestJson}
            onManifestChange={handleManifestChange}
            testStatus={wizard.testStatus}
            testOutput={wizard.testOutput}
            onRunTest={() => void wizard.runSandboxTest()}
            stepPanel={stepPanel}
            showStepPanel={showStepPanel}
          />

          <HubDeployInspector
            mode={mode}
            draft={wizard.draft}
            activeUiStep={activeUiStep}
            stepChecks={stepChecks}
            publishReady={wizard.publishReady}
            publishStatus={wizard.publishStatus}
            lastPublishedPlatformId={wizard.lastPublishedPlatformId}
            onChange={(patch) => wizard.updateDraft(patch)}
            onPublish={handlePublish}
          />
        </div>

        <HubDeployTemplates onSelect={setAgentSeed} />

        {wizard.publishStatus === "idle" || wizard.publishStatus === "submitting" ? (
          <DeployFooter
            onBack={wizard.goBack}
            onNext={wizard.goNext}
            canGoBack={wizard.currentStep > 1}
            canGoNext={
              mode === "capability"
                ? wizard.currentStep < 6
                : wizard.currentStep < 14
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function DeployFooter({
  onBack,
  onNext,
  canGoBack,
  canGoNext,
}: {
  onBack: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#111318] px-4 py-2">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium",
          canGoBack
            ? "text-[#b0b8c1] hover:bg-white/[0.04]"
            : "cursor-not-allowed text-[#6b7684]",
        )}
      >
        <ChevronLeft className="size-4" />
        이전
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold",
          canGoNext
            ? "bg-[#4593fc] text-white hover:bg-[#3a82e0]"
            : "cursor-not-allowed bg-white/[0.06] text-[#6b7684]",
        )}
      >
        다음
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function CapabilityStepPanel({ wizard }: { wizard: HubCapabilityWizard }) {
  switch (wizard.currentStep) {
    case 1:
      return <PackageStep wizard={wizard} />;
    case 2:
      return <ManifestStep wizard={wizard} />;
    case 3:
      return <PermissionsStep wizard={wizard} />;
    case 4:
      return <ContextStep wizard={wizard} />;
    case 5:
      return <TestStep wizard={wizard} />;
    case 6:
      return <ReviewStep wizard={wizard} />;
    default:
      return null;
  }
}

function PlatformStepPanel({ wizard }: { wizard: HubPlatformWizard }) {
  switch (wizard.currentStep) {
    case 1:
      return <IdentityStep wizard={wizard} />;
    case 2:
      return <OrganizationStep wizard={wizard} />;
    case 3:
      return <ProductStep wizard={wizard} />;
    case 4:
      return <ArchitectureStep wizard={wizard} />;
    case 5:
      return <DataStep wizard={wizard} />;
    case 6:
      return <UiStep wizard={wizard} />;
    case 7:
      return <CapabilitiesStep wizard={wizard} />;
    case 8:
      return <WorkflowStep wizard={wizard} />;
    case 9:
      return <PlatformPermissionsStep wizard={wizard} />;
    case 10:
      return <MarketsStep wizard={wizard} />;
    case 11:
      return <CommerceStep wizard={wizard} />;
    case 12:
      return <SecurityStep wizard={wizard} />;
    case 13:
      return <PlatformTestingStep wizard={wizard} />;
    case 14:
      return <PlatformReviewStep wizard={wizard} />;
    default:
      return null;
  }
}
