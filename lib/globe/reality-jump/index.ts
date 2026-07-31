/**
 * Reality Jump barrel — Semantic UI entity activation from AI prose.
 */

export {
  extractRealityJumpTargets,
  splitTextWithRealityJumps,
  type RealityJumpTarget,
  type RealityJumpTextPart,
} from "@/lib/globe/reality-jump/linkify-assistant-entities";
export {
  REALITY_JUMP_EVENT,
  dispatchRealityJump,
  subscribeRealityJump,
  type RealityJumpDetail,
} from "@/lib/globe/reality-jump/dispatch-reality-jump";
