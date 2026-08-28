import type { WizardStepId } from "@/lib/hub/capability/types";
import type { PlatformWizardStepId } from "@/lib/hub/platform/types";

export const DEPLOY_UI_STEPS = [
  { id: 1, labelKo: "아이디어", labelEn: "Idea" },
  { id: 2, labelKo: "설계", labelEn: "Design" },
  { id: 3, labelKo: "코드", labelEn: "Code" },
  { id: 4, labelKo: "권한", labelEn: "Permissions" },
  { id: 5, labelKo: "테스트", labelEn: "Test" },
  { id: 6, labelKo: "제출", labelEn: "Submit" },
] as const;

export type DeployUiStepId = (typeof DEPLOY_UI_STEPS)[number]["id"];

/** UI step index (1-6) → capability wizard internal step */
export const CAPABILITY_UI_TO_INTERNAL: Record<DeployUiStepId, WizardStepId> = {
  1: 1,
  2: 2,
  3: 4,
  4: 3,
  5: 5,
  6: 6,
};

export function capabilityInternalToUiStep(internal: WizardStepId): DeployUiStepId {
  const map: Record<WizardStepId, DeployUiStepId> = {
    1: 1,
    2: 2,
    3: 4,
    4: 3,
    5: 5,
    6: 6,
  };
  return map[internal];
}

/** UI step → platform wizard entry step for that phase */
export const PLATFORM_UI_TO_INTERNAL: Record<DeployUiStepId, PlatformWizardStepId> = {
  1: 1,
  2: 4,
  3: 7,
  4: 9,
  5: 13,
  6: 14,
};

export function platformInternalToUiStep(internal: PlatformWizardStepId): DeployUiStepId {
  if (internal <= 3) return 1;
  if (internal <= 6) return 2;
  if (internal <= 8) return 3;
  if (internal <= 12) return 4;
  if (internal === 13) return 5;
  return 6;
}
