"use client";

import { useEffect, useRef } from "react";
import {
  resumeHubAgentController,
  runHubAgentController,
  type HubAgentControllerEvent,
} from "@/lib/hub/dev/hub-agent-controller";
import { classifyIntent } from "@/lib/agent/conversation/classify-intent";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import {
  clearPendingHubLoopResume,
  readHubDevConnections,
  readPendingHubLoopResume,
} from "@/lib/hub/dev/hub-connection-store";
import { resumeUtteranceForProvider } from "@/lib/hub/dev/hub-oauth-connect";

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
  readonly resumeProvider?: HubPlatformProviderId | null;
}) {
  const runningRef = useRef(false);
  const lastResumeToken = useRef(0);
  const lastSeedRef = useRef<string | null>(null);

  useEffect(() => {
    const utterance = props.agentSeed?.trim();
    if (!utterance || runningRef.current) return;
    if (lastSeedRef.current === utterance) return;

    lastSeedRef.current = utterance;
    runningRef.current = true;
    props.onSeedConsumed();

    const classified = classifyIntent(utterance);
    if (classified.intent === "connect") {
      clearPendingHubLoopResume();
    }

    const connections = readHubDevConnections();
    void runHubAgentController({
      utterance,
      draft: props.draft,
      snapshot: props.snapshot,
      executor: props.executor,
      stripeConnected: props.stripeConnected ?? connections.stripe,
      connections,
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

    const pending = readPendingHubLoopResume();
    const provider = props.resumeProvider ?? pending?.provider ?? null;
    if (!provider || !pending) return;
    if (pending.provider && pending.provider !== provider) return;

    const connections = readHubDevConnections();
    const providerConnected = Boolean(connections[provider as keyof typeof connections]);
    if (!providerConnected) return;

    lastResumeToken.current = token;
    runningRef.current = true;

    void resumeHubAgentController({
      utterance: pending.utterance || props.resumeUtterance || resumeUtteranceForProvider(provider),
      draft: props.draft,
      snapshot: props.snapshot,
      executor: props.executor,
      stripeConnected: provider === "stripe" ? true : props.stripeConnected,
      connections: { ...connections, [provider]: true },
      platformId: props.draft.id,
      resumeProvider: provider,
      staleGoal: null,
      onEvent: props.onLoopEvent,
    }).finally(() => {
      runningRef.current = false;
      clearPendingHubLoopResume();
    });
  }, [
    props.resumeLoopToken,
    props.resumeUtterance,
    props.resumeProvider,
    props.stripeConnected,
    props.draft,
    props.snapshot,
    props.executor,
    props.onLoopEvent,
  ]);

  return null;
}
