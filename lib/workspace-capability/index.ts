export type {
  CapabilitySize,
  CapabilitySlot,
  WorkspaceCapabilityDef,
  WorkspaceCapabilityId,
  WorkspaceCapabilityIntentId,
  WorkspaceCapabilityLayout,
  WorkspaceCapabilityLayoutItem,
  WorkspaceCapabilityOp,
  WorkspaceCapabilityRecipe,
} from "@/lib/workspace-capability/types";
export {
  WORKSPACE_CAPABILITY_IDS,
  WORKSPACE_CAPABILITY_INTENT_IDS,
} from "@/lib/workspace-capability/types";

export {
  getWorkspaceCapability,
  isWorkspaceCapabilityId,
  listWorkspaceCapabilities,
} from "@/lib/workspace-capability/registry";

export {
  getWorkspaceCapabilityRecipe,
  listWorkspaceCapabilityRecipes,
} from "@/lib/workspace-capability/recipes";

export {
  resolveWorkspaceCapabilityIntent,
  resolveWorkspaceCapabilityIntentForState,
} from "@/lib/workspace-capability/resolve-capability-intent";

export {
  clearWorkspaceCapabilityLayout,
  readWorkspaceCapabilityLayout,
  resetWorkspaceCapabilityLayoutsForTests,
  subscribeWorkspaceCapabilityLayout,
  writeWorkspaceCapabilityLayout,
} from "@/lib/workspace-capability/layout-store";

export {
  applyWorkspaceCapabilityOp,
  buildLayoutFromRecipe,
  isCapabilityOpen,
  listOpenCapabilities,
  listOpenInSlot,
} from "@/lib/workspace-capability/apply-capability-op";

export {
  openCapabilityLayoutForWorkspace,
  tryApplyCapabilityUtterance,
} from "@/lib/workspace-capability/open-capability-layout";

export {
  buildWorkspaceCapabilityViewModel,
  capabilityChromeNeeded,
} from "@/lib/workspace-capability/project-capability-view-model";
export type {
  CapabilityBookingChip,
  CapabilityBudgetRollup,
  CapabilityDayCard,
  CapabilityTimelineRow,
  WorkspaceCapabilityViewModel,
} from "@/lib/workspace-capability/project-capability-view-model";
