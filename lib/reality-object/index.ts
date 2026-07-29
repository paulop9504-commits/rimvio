export type {
  RealityObject,
  RealityObjectState,
  RealityObjectRelationship,
  CommitHistoryEntry,
} from "@/lib/reality-object/types";
export { REALITY_OBJECT_TRANSITIONS } from "@/lib/reality-object/types";
export {
  createRealityObject,
  getRealityObject,
  transitionRealityObject,
  listRealityObjects,
  clearRealityObjects,
} from "@/lib/reality-object/reality-object-store";
