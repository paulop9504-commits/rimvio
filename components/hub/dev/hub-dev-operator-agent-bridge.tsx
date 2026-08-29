"use client";

import { useEffect, useRef } from "react";
import {
  resumeHubAgentLoop,
  runHubAgentLoop,
  type HubAgentLoopEvent,
} from "@/lib/hub/dev/hub-agent-loop";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";

/** Runs Hub Agent Loop on seed — drives Platform Operator UI via events. */
export function HubDevOperatorAgentBridge(props: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly testsPassed: boolean;
  readonly executor: DeployExecutorCallbacks;
  readonly onApplyPatch: (patch: Partial<PlatformDraft>) => void;
  readonly agentSeed: string | null;
  readonly onSeedConsumed: () => void;
  readonly onLoopEvent: (event: HubAgentLoopEvent) => void;
  readonly stripeConnected?: boolean;
  readonly resumeLoopToken?: number;
  readonly resumeUtterance?: string | null;
}) {
  const runningRef = useRef(false);
  const lastResumeToken = useRef(0);

  useEffect(() => {
    const utterance = props.agentSeed?.trim();
    if (!utterance || runningRef.current) return;

    runningRef.current = true;
    props.onSeedConsumed();

    void runHubAgentLoop({
      utterance,
      draft: props.draft,
      snapshot: props.snapshot,
      executor: props.executor,
      stripeConnected: props.stripeConnected,
      platformId: props.draft.id,
      onEvent: props.onLoopEvent,
    }).finally(() => {
      runningRef.current = false;
    });
  }, [
    props.agentSeed,
    props.draft,
    props.snapshot,
    props.executor,
    props.onLoopEvent,
    props.onSeedConsumed,
    props.stripeConnected,
  ]);

  useEffect(() => {
    const token = props.resumeLoopToken ?? 0;
    if (token <= 0 || token === lastResumeToken.current || runningRef.current) return;
    if (!props.stripeConnected) return;

    lastResumeToken.current = token;
    runningRef.current = true;

    void resumeHubAgentLoop({
      utterance: props.resumeUtterance ?? "Stripe 연결 완료 — 결제 capability 이어서 진행",
      draft: props.draft,
      snapshot: props.snapshot,
      executor: props.executor,
      stripeConnected: true,
      platformId: props.draft.id,
      connections: { stripe: true },
      onEvent: props.onLoopEvent,
    }).finally(() => {
      runningRef.current = false;
    });
  }, [
    props.resumeLoopToken,
    props.resumeUtterance,
    props.stripeConnected,
    props.draft,
    props.snapshot,
    props.executor,
    props.onLoopEvent,
  ]);

  return null;
}
