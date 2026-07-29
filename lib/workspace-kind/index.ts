export type {
  WorkspaceFocusGhostRow,
  WorkspaceFocusGhostStatus,
  WorkspaceFocusSurface,
  WorkspaceKind,
  WorkspaceKindTemplate,
  WorkspacePrepCardModel,
  WorkspaceSlotDef,
  WorkspaceSlotFiller,
} from "@/lib/workspace-kind/types";
export { WORKSPACE_KINDS } from "@/lib/workspace-kind/types";
export {
  DRIVER_WORKSPACE_TEMPLATE,
  TRAVEL_WORKSPACE_TEMPLATE,
  USED_GOODS_WORKSPACE_TEMPLATE,
  USED_GOODS_BUY_FOCUS_SEQUENCE,
  USED_GOODS_SELL_FOCUS_SEQUENCE,
  listWorkspaceKindTemplates,
  usedGoodsFocusSequence,
  workspaceKindTemplate,
} from "@/lib/workspace-kind/templates";
export {
  classifyMarketWorkspaceRole,
  classifyWorkspaceKind,
  isDriverWorkspaceUtterance,
  isTravelWorkspaceUtterance,
  isUsedGoodsWorkspaceUtterance,
} from "@/lib/workspace-kind/classify-workspace-kind";
export { buildWorkspacePrepCard } from "@/lib/workspace-kind/build-workspace-prep-card";
export {
  advanceWorkspaceFocus,
  buildWorkspaceFocusSurface,
} from "@/lib/workspace-kind/build-workspace-focus-surface";
export {
  prepareWorkspaceResources,
  type PrepareWorkspaceResourcesResult,
} from "@/lib/workspace-kind/prepare-workspace-resources";
export {
  DRIVER_WORKSPACE_SHELL_OPEN,
  openWorkspaceFromPrepCard,
  type DriverWorkspaceShellOpenDetail,
} from "@/lib/workspace-kind/open-workspace-from-prep-card";
export {
  runWorkspaceIntentContinuum,
  seedTravelLodgingForContinuum,
  type WorkspaceIntentContinuumResult,
} from "@/lib/workspace-kind/run-workspace-intent-continuum";
export { ensureMarketContextEvent } from "@/lib/workspace-kind/ensure-market-context-event";
export {
  activeContextAllowsDomainScout,
  resolveActiveWorkspaceKind,
} from "@/lib/workspace-kind/resolve-active-workspace-kind";
