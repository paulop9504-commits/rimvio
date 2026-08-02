/**
 * Mobile Spatial AI Workspace — state + projection helpers.
 */

export type {
  MobileCalloutMode,
  MobileWorkspaceAction,
  MobileWorkspaceEntity,
  MobileWorkspaceEntityKind,
  MobileWorkspaceIntent,
  MobileWorkspaceRelation,
  MobileWorkspaceRelationKind,
  MobileWorkspaceState,
} from "@/lib/mobile-workspace/types";

export { MOBILE_CALLOUT_MODES } from "@/lib/mobile-workspace/types";

export {
  clearMobileWorkspaceForTests,
  dispatchMobileWorkspace,
  emptyMobileWorkspaceState,
  getMobileWorkspaceSnapshot,
  readMobileWorkspace,
  subscribeMobileWorkspace,
} from "@/lib/mobile-workspace/store";

export {
  buildNearbyRelationsFromAnchor,
  mobileEntitiesFromWorkspaceNodes,
  parseMobileWorkspaceCommand,
} from "@/lib/mobile-workspace/from-workspace";
