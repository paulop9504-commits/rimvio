/**
 * Workspace Patch barrel — Patch-only mutation SSOT.
 */

export type {
  WorkspacePatch,
  WorkspacePatchKind,
  WorkspacePatchRecord,
} from "@/lib/context-workspace/workspace-patch/types";

export { WORKSPACE_PATCH_KINDS } from "@/lib/context-workspace/workspace-patch/types";

export { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch/parse-workspace-patch";

export {
  applyWorkspacePatch,
  type ApplyWorkspacePatchResult,
} from "@/lib/context-workspace/workspace-patch/apply-workspace-patch";
