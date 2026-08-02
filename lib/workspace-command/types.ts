/**
 * Reality OS — Workspace Draft types.
 * Workspace = Draft Environment. Globe Reality = Read Only.
 */

export const WORKSPACE_INTENT_ACTIONS = [
  "filter",
  "add_constraint",
  "remove_constraint",
  "replace",
  "move",
  "compare",
  "simulate",
  "prepare",
  "modify_context",
  "optimize_context",
  "analyze_context",
  "create_draft",
] as const;

export type WorkspaceIntentAction = (typeof WORKSPACE_INTENT_ACTIONS)[number];

export type WorkspaceCommand = {
  readonly id: string;
  readonly workspaceId: string;
  readonly rawText: string;
  readonly createdAt: string;
};

export type WorkspaceIntent = {
  readonly action: WorkspaceIntentAction;
  readonly target: string;
  readonly parameters: Readonly<Record<string, unknown>>;
};

/** Legacy immediate mutation shape — prefer DraftMutation */
export type WorkspaceMutation = {
  readonly workspaceId: string;
  readonly targetObjectId?: string;
  readonly mutationType: string;
  readonly changes: Readonly<Record<string, unknown>>;
};

export type DraftMutationStatus = "proposed" | "applied" | "rejected";

export type WorkspaceImpact = {
  readonly visibleHotelsDeltaPct: number | null;
  readonly beforeVisibleCount: number;
  readonly afterVisibleCount: number;
  readonly summaryKo: string;
  readonly details: Readonly<Record<string, unknown>>;
};

export type RealityDiff = {
  readonly before: Readonly<Record<string, unknown>>;
  readonly after: Readonly<Record<string, unknown>>;
  readonly impact: WorkspaceImpact;
};

/**
 * Draft Reality Mutation — never applied to Global Reality on create.
 * Stored on Workspace Draft Layer only.
 */
export type DraftMutation = {
  readonly id: string;
  readonly workspaceId: string;
  readonly targetObjectId: string;
  readonly beforeState: Readonly<Record<string, unknown>>;
  readonly afterState: Readonly<Record<string, unknown>>;
  readonly impact: WorkspaceImpact;
  readonly status: DraftMutationStatus;
  readonly intent: WorkspaceIntent;
  readonly commandId: string;
  readonly rawText: string;
  readonly realityDiff: RealityDiff;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export type WorkspaceActionProposal = {
  readonly draft: DraftMutation;
  readonly previewKo: string;
  readonly applyLabelKo: string;
  readonly cancelLabelKo: string;
};

export type WorkspaceCommandHistoryEntry = {
  readonly id: string;
  readonly workspaceId: string;
  readonly userInput: string;
  readonly intent: WorkspaceIntent | null;
  readonly draftMutationId: string | null;
  readonly appliedAtIso: string | null;
  readonly createdAtIso: string;
};

export type WorkspaceDraftEventName =
  | "rimvio:workspace-draft-created"
  | "rimvio:workspace-draft-updated"
  | "rimvio:workspace-draft-applied";

export type WorkspaceDraftEventDetail = {
  readonly workspaceId: string;
  readonly draftId: string;
  readonly status: DraftMutationStatus;
  readonly atIso: string;
  readonly draftOnly: true;
};

export type WorkspaceProjectionUpdateDetail = {
  readonly workspaceId: string;
  readonly commandId: string;
  readonly intentAction: WorkspaceIntentAction;
  readonly mutationType: string;
  readonly atIso: string;
  readonly draftOnly: true;
  readonly draftId?: string;
};

export type WorkspaceCommandRuntimeOk = {
  readonly ok: true;
  readonly command: WorkspaceCommand;
  readonly intent: WorkspaceIntent;
  /** Immediate path (legacy tests) — usually empty when proposing */
  readonly mutation: WorkspaceMutation | null;
  readonly summaryKo: string;
  readonly draftVersion: number;
  /** Reality OS path — proposal awaiting Apply */
  readonly proposal: WorkspaceActionProposal | null;
  readonly mode: "proposed" | "applied";
};

export type WorkspaceCommandRuntimeReject = {
  readonly ok: false;
  readonly command: WorkspaceCommand | null;
  readonly reasonKo: string;
  readonly inactiveWorkspace: boolean;
  readonly forbiddenGlobeMutation: boolean;
};

export type WorkspaceCommandRuntimeResult =
  | WorkspaceCommandRuntimeOk
  | WorkspaceCommandRuntimeReject;
