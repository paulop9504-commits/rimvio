/**
 * Natural Language Reality Command Engine
 *
 * Input → Intent → Action Proposal → Draft
 */

export type {
  RealityActionProposal,
  RealityCommandAction,
  RealityCommandConstraint,
  RealityCommandInput,
  RealityCommandIntent,
  RealityCommandResult,
} from "@/lib/reality-command/types";

export { REALITY_COMMAND_ACTIONS } from "@/lib/reality-command/types";

export {
  formatRealityIntentPreviewKo,
  looksLikeRealityCommitCommand,
  resolveRealityCommandIntent,
} from "@/lib/reality-command/intent-resolver";

export { buildRealityActionProposal } from "@/lib/reality-command/action-proposal";

export {
  parseRealityCommand,
  runRealityCommand,
  toWorkspaceIntent,
} from "@/lib/reality-command/run-reality-command";
