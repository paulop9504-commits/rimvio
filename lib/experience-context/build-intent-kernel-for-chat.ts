import type { IntentRoute } from "@/lib/action-chat/intent-router-core";
import { buildIntentKernel } from "@/lib/intent/build-intent-kernel";
import type { BehaviorContext, IntentKernelResult } from "@/lib/intent/kernel-types";
import { buildConfidenceState } from "@/lib/screenshot/confidence-state";

/** Adapt Event Kernel route confidence into lib/intent ConfidenceState for chat NL. */
export function buildIntentKernelForChat(input: {
  message: string;
  route: IntentRoute;
  behavior: BehaviorContext;
  now?: number;
}): IntentKernelResult {
  const score = Math.max(
    0,
    Math.min(100, Math.round(input.route.micro_confidence * 100)),
  );

  const state = buildConfidenceState({
    score,
    signals: [],
    primaryReason: `chat:${input.route.micro_intent}`,
    sources: {
      regex: score,
      vision: 0,
      llm: 0,
    },
  });

  return buildIntentKernel({
    state,
    behavior: input.behavior,
    llmInvoked: false,
    llmSource: "skipped",
    domain: input.behavior.current?.domain ?? null,
    category: input.behavior.current?.category ?? null,
    title: input.behavior.current?.title ?? input.message.trim(),
    now: input.now,
  });
}
