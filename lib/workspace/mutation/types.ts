/**
 * Workspace Mutation Engine — typed mutations applied to Workspace State only.
 * Never Global Reality Store.
 */

export const WORKSPACE_ENGINE_MUTATION_TYPES = [
  "FILTER_OBJECT",
  "ADD_CONSTRAINT",
  "REMOVE_CONSTRAINT",
  "REPLACE_OBJECT",
  "MOVE_OBJECT",
  "COMPARE_OBJECT",
  "SIMULATE",
  "PREPARE",
] as const;

export type WorkspaceEngineMutationType =
  (typeof WORKSPACE_ENGINE_MUTATION_TYPES)[number];

export type WorkspaceEngineMutation = {
  readonly type: WorkspaceEngineMutationType;
  readonly target: string;
  readonly changes: Readonly<Record<string, unknown>>;
  readonly objectId?: string;
};

export type WorkspaceEngineApplyResult = {
  readonly ok: true;
  readonly mutation: WorkspaceEngineMutation;
  readonly workspaceId: string;
  readonly beforeVisibleCount: number;
  readonly afterVisibleCount: number;
  readonly summaryKo: string;
} | {
  readonly ok: false;
  readonly reasonKo: string;
  readonly forbiddenRealityMutation: boolean;
};
