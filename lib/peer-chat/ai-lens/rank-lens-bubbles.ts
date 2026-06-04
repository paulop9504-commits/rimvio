import { buildDeepLinkBubbleCandidates } from "@/lib/peer-chat/ai-lens/build-bubble-candidates";
import { detectLensThreadContext } from "@/lib/peer-chat/ai-lens/detect-thread-context";
import {
  lensActionFrequencyBoost,
  lensUserHistoryWeight,
} from "@/lib/peer-chat/ai-lens/lens-user-history";
import type {
  DeepLinkBubbleCandidate,
  PeerAiLensAnalysis,
} from "@/lib/peer-chat/ai-lens/types";
import type { PeerMessage } from "@/lib/context/peer-message-types";

export const MAX_LENS_BUBBLES = 3;

function contextScore(candidate: DeepLinkBubbleCandidate): number {
  return candidate.confidence;
}

function rankScore(candidate: DeepLinkBubbleCandidate): number {
  const history = lensUserHistoryWeight(candidate.actionType);
  const frequency = lensActionFrequencyBoost(candidate.actionType);
  return (
    contextScore(candidate) * history * frequency
  );
}

export function rankDeepLinkBubbleCandidates(
  raw: readonly DeepLinkBubbleCandidate[],
): DeepLinkBubbleCandidate[] {
  return [...raw]
    .map((candidate) => ({
      ...candidate,
      score: rankScore(candidate),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_LENS_BUBBLES);
}

/** Pure read: analyze thread → ranked bubble candidates (no execution). */
export function analyzePeerThreadForLens(
  messages: readonly PeerMessage[],
  referenceDate: Date = new Date(),
): PeerAiLensAnalysis {
  const context = detectLensThreadContext(messages, 12, referenceDate);
  const raw = buildDeepLinkBubbleCandidates(context);
  const candidates = rankDeepLinkBubbleCandidates(raw);

  return {
    anchorMessageId: context.anchorMessageId,
    candidates,
    context,
  };
}
