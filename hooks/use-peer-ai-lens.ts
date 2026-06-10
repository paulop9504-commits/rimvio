"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { analyzePeerThreadForLens } from "@/lib/peer-chat/ai-lens/rank-lens-bubbles";
import { recordLensBubbleShown } from "@/lib/peer-chat/ai-lens/lens-user-history";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import type { PeerMessage } from "@/lib/context/peer-message-types";

export function usePeerAiLens(input: {
  messages: readonly PeerMessage[];
  enabled: boolean;
}) {
  const [candidates, setCandidates] = useState<DeepLinkBubbleCandidate[]>([]);
  const [candidatesByMessageId, setCandidatesByMessageId] = useState<
    Readonly<Record<string, DeepLinkBubbleCandidate[]>>
  >({});
  const [anchorMessageId, setAnchorMessageId] = useState<string | null>(null);
  const lastShownKey = useRef<string>("");

  const analysis = useMemo(() => {
    if (!input.enabled || input.messages.length === 0) {
      return null;
    }
    return analyzePeerThreadForLens(input.messages);
  }, [input.enabled, input.messages]);

  useEffect(() => {
    if (!input.enabled || !analysis) {
      setCandidates([]);
      setCandidatesByMessageId({});
      setAnchorMessageId(null);
      return;
    }

    setCandidates(analysis.candidates);
    setCandidatesByMessageId(analysis.candidatesByMessageId);
    setAnchorMessageId(analysis.anchorMessageId);

    const key = `${analysis.anchorMessageId ?? "none"}:${analysis.candidates.map((c) => c.id).join(",")}`;
    if (key !== lastShownKey.current && analysis.candidates.length > 0) {
      lastShownKey.current = key;
      recordLensBubbleShown(analysis.candidates.map((c) => c.actionType));
    }
  }, [analysis, input.enabled]);

  return {
    anchorMessageId,
    candidates,
    candidatesByMessageId,
    enabled: input.enabled,
  };
}
