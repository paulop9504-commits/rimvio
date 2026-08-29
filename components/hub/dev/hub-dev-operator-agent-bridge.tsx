"use client";

import { useEffect, useRef } from "react";
import {
  resumeHubAgentController,
  runHubAgentController,
  type HubAgentControllerEvent,
} from "@/lib/hub/dev/hub-agent-controller";

/** Runs Hub Agent Controller on seed — Intent Gate → Loop → UI events. */
export function HubDevOperatorAgentBridge(props: {
  readonly draft: import("@/lib/hub/platform/types").PlatformDraft;
  readonly snapshot: import("@/lib/hub/dev/dev-project-state").DevProjectSnapshot;
  readonly testsPassed: boolean;
  readonly executor: import("@/lib/hub/deploy/hub-deploy-runtime").DeployExecutorCallbacks;
  readonly onApplyPatch: (patch: Partial<import("@/lib/hub/platform/types").PlatformDraft>) => void;
  readonly agentSeed: string | null;
  readonly onSeedConsumed: () => void;
  readonly onLoopEvent: (event: HubAgentControllerEvent) => void;
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

    void runHubAgentController({
      utterance,
      draft: props.draft,
      snapshot: props.snapshot,
      executor: props.executor,
      stripeConnected: props.stripeConnected,
      platformId: props.draft.id,
      staleGoal: null,
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

    void resumeHubAgentController({
      utterance: props.resumeUtterance ?? "Stripe 연결 완료 — 결제 capability 이어서 진행",
      draft: props.draft,
      snapshot: props.snapshot,
      executor: props.executor,
      stripeConnected: true,
      platformId: props.draft.id,
      connections: { stripe: true },
      staleGoal: null,
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
