/**
 * Rimvio Reality Projection Engine
 *
 * Workspace Draft State → Globe / Workspace UI Projection
 * Reality Layer remains Read Only.
 */

export type {
  ProjectionBuildInput,
  ProjectionEvent,
  ProjectionEventType,
  ProjectionSnapshot,
} from "@/lib/projection-engine/projection-types";
export { PROJECTION_EVENT_TYPES } from "@/lib/projection-engine/projection-types";

export {
  appendProjectionEvent,
  clearProjectionForTests,
  listProjectionEvents,
  readProjectionSnapshot,
  writeProjectionSnapshot,
} from "@/lib/projection-engine/projection-store";

export {
  REALITY_PROJECTION_EVENT,
  REALITY_PROJECTION_REFRESH,
  dispatchProjectionEvent,
  dispatchProjectionRefresh,
  subscribeProjectionEvents,
  subscribeProjectionRefresh,
  type RealityProjectionRefreshDetail,
} from "@/lib/projection-engine/projection-events";

export {
  assertProjectionDoesNotMutateReality,
  buildProjectionEvents,
  buildProjectionEventsFromVisibility,
  projectDraftMutationApplied,
  projectVisibilityToContextWorkspace,
  runProjectionHandler,
} from "@/lib/projection-engine/projection-handler";
