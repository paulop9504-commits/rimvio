/**
 * Natural Language Reality Command — types.
 *
 * Flow: Input → Intent Resolver → Action Proposal → Draft
 * Never Reality Commit (Human / Field only).
 */

export const REALITY_COMMAND_ACTIONS = [
  "filter",
  "replace",
  "move",
  "compare",
  "optimize",
  "simulate",
  "prepare",
] as const;

export type RealityCommandAction = (typeof REALITY_COMMAND_ACTIONS)[number];

export type RealityCommandConstraint = Readonly<Record<string, unknown>>;

/**
 * Resolved Intent — product Reality Action shape.
 *
 * Example ("캡슐호텔만 보여줘"):
 *   { target: "Hotel", action: "filter", constraint: { type: "capsule" } }
 */
export type RealityCommandIntent = {
  readonly target: string;
  readonly action: RealityCommandAction;
  readonly constraint: RealityCommandConstraint;
};

export type RealityCommandInput = {
  readonly workspaceId: string;
  readonly text: string;
  readonly targetObjectId?: string | null;
};

export type RealityActionProposal = {
  readonly intent: RealityCommandIntent;
  readonly previewKo: string;
  readonly applyLabelKo: string;
  readonly cancelLabelKo: string;
  readonly draftId: string | null;
  /** Linked Workspace Draft when proposed into Active Workspace */
  readonly draftStatus: "proposed" | null;
};

export type RealityCommandResult =
  | {
      readonly ok: true;
      readonly input: string;
      readonly intent: RealityCommandIntent;
      readonly proposal: RealityActionProposal;
      readonly summaryKo: string;
    }
  | {
      readonly ok: false;
      readonly input: string;
      readonly reasonKo: string;
      readonly forbiddenCommit: boolean;
    };
